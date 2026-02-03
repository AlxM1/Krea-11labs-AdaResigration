"""
Text-to-Speech Service using XTTS v2 and other models
"""
import os
import io
import torch
import torchaudio
import tempfile
import hashlib
from typing import Optional, Generator, Tuple
from pathlib import Path
import soundfile as sf
import numpy as np
from pydub import AudioSegment

from app.core.config import settings
from app.schemas.audio import VoiceSettings, OutputFormat


class TTSService:
    """
    Text-to-Speech service supporting multiple models:
    - XTTS v2 (Coqui): High-quality multilingual TTS with voice cloning
    - Future: Chatterbox, Fish Audio integration
    """

    def __init__(self):
        self.device = settings.DEVICE if torch.cuda.is_available() else "cpu"
        self.model = None
        self.model_name = settings.TTS_MODEL
        self._initialized = False
        self.voices_cache = {}

    async def initialize(self):
        """Initialize TTS model (lazy loading)"""
        if self._initialized:
            return

        try:
            from TTS.api import TTS

            print(f"Loading TTS model: {self.model_name}")
            print(f"Using device: {self.device}")

            self.model = TTS(self.model_name).to(self.device)
            self._initialized = True
            print("TTS model loaded successfully")

        except Exception as e:
            print(f"Error loading TTS model: {e}")
            # Fallback to a simpler model
            try:
                from TTS.api import TTS
                fallback_model = "tts_models/en/ljspeech/tacotron2-DDC"
                print(f"Falling back to: {fallback_model}")
                self.model = TTS(fallback_model).to(self.device)
                self.model_name = fallback_model
                self._initialized = True
            except Exception as e2:
                print(f"Fallback also failed: {e2}")
                raise

    async def generate_speech(
        self,
        text: str,
        voice_id: str,
        voice_settings: Optional[VoiceSettings] = None,
        output_format: OutputFormat = OutputFormat.MP3,
        sample_rate: Optional[int] = None,
        language: Optional[str] = None,
        reference_audio_path: Optional[str] = None
    ) -> Tuple[bytes, float, int]:
        """
        Generate speech from text.

        Returns:
            Tuple of (audio_bytes, duration_seconds, sample_rate)
        """
        await self.initialize()

        if voice_settings is None:
            voice_settings = VoiceSettings()

        # Get reference audio for voice cloning
        if reference_audio_path is None:
            reference_audio_path = self._get_voice_reference(voice_id)

        target_sample_rate = sample_rate or settings.DEFAULT_SAMPLE_RATE

        try:
            # Generate with XTTS
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            # XTTS-specific generation
            if "xtts" in self.model_name.lower():
                self.model.tts_to_file(
                    text=text,
                    file_path=tmp_path,
                    speaker_wav=reference_audio_path,
                    language=language or "en",
                    split_sentences=True
                )
            else:
                # Generic TTS generation
                self.model.tts_to_file(
                    text=text,
                    file_path=tmp_path
                )

            # Load generated audio
            audio_data, sr = sf.read(tmp_path)

            # Apply voice settings
            audio_data = self._apply_voice_settings(audio_data, sr, voice_settings)

            # Resample if needed
            if sr != target_sample_rate:
                audio_data = self._resample(audio_data, sr, target_sample_rate)
                sr = target_sample_rate

            # Calculate duration
            duration = len(audio_data) / sr

            # Convert to output format
            audio_bytes = self._convert_format(
                audio_data, sr, output_format
            )

            # Cleanup
            os.unlink(tmp_path)

            return audio_bytes, duration, sr

        except Exception as e:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise Exception(f"TTS generation failed: {str(e)}")

    async def generate_speech_stream(
        self,
        text: str,
        voice_id: str,
        voice_settings: Optional[VoiceSettings] = None,
        output_format: OutputFormat = OutputFormat.MP3,
        language: Optional[str] = None,
        reference_audio_path: Optional[str] = None
    ) -> Generator[bytes, None, None]:
        """
        Generate speech with streaming output.
        Yields audio chunks as they're generated.
        """
        await self.initialize()

        if voice_settings is None:
            voice_settings = VoiceSettings()

        if reference_audio_path is None:
            reference_audio_path = self._get_voice_reference(voice_id)

        # Split text into sentences for streaming
        sentences = self._split_into_sentences(text)

        for sentence in sentences:
            if not sentence.strip():
                continue

            try:
                audio_bytes, _, _ = await self.generate_speech(
                    text=sentence,
                    voice_id=voice_id,
                    voice_settings=voice_settings,
                    output_format=output_format,
                    language=language,
                    reference_audio_path=reference_audio_path
                )
                yield audio_bytes

            except Exception as e:
                print(f"Error generating sentence: {e}")
                continue

    def _get_voice_reference(self, voice_id: str) -> Optional[str]:
        """Get reference audio path for a voice ID"""
        # Check cache first
        if voice_id in self.voices_cache:
            return self.voices_cache[voice_id]

        # Check for stored voice references
        voice_dir = Path(settings.STORAGE_PATH) / "voices" / voice_id
        if voice_dir.exists():
            # Look for reference audio
            for ext in ['.wav', '.mp3', '.flac']:
                ref_path = voice_dir / f"reference{ext}"
                if ref_path.exists():
                    self.voices_cache[voice_id] = str(ref_path)
                    return str(ref_path)

        # Return default voice reference or None
        default_voice = Path(settings.STORAGE_PATH) / "voices" / "default" / "reference.wav"
        if default_voice.exists():
            return str(default_voice)

        return None

    def _apply_voice_settings(
        self,
        audio: np.ndarray,
        sample_rate: int,
        settings: VoiceSettings
    ) -> np.ndarray:
        """Apply voice settings to audio"""
        # Apply speed adjustment
        if settings.speed != 1.0:
            # Use librosa for time stretching
            try:
                import librosa
                audio = librosa.effects.time_stretch(audio, rate=settings.speed)
            except Exception:
                pass  # Skip if librosa fails

        return audio

    def _resample(
        self,
        audio: np.ndarray,
        orig_sr: int,
        target_sr: int
    ) -> np.ndarray:
        """Resample audio to target sample rate"""
        if orig_sr == target_sr:
            return audio

        try:
            import librosa
            return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr)
        except Exception:
            # Fallback using scipy
            from scipy import signal
            num_samples = int(len(audio) * target_sr / orig_sr)
            return signal.resample(audio, num_samples)

    def _convert_format(
        self,
        audio: np.ndarray,
        sample_rate: int,
        output_format: OutputFormat
    ) -> bytes:
        """Convert audio to specified output format"""
        # Ensure audio is in correct range
        if audio.dtype == np.float64 or audio.dtype == np.float32:
            audio = np.clip(audio, -1.0, 1.0)

        # Create buffer
        buffer = io.BytesIO()

        if output_format == OutputFormat.WAV:
            sf.write(buffer, audio, sample_rate, format='WAV')

        elif output_format == OutputFormat.PCM:
            # Raw PCM
            pcm_data = (audio * 32767).astype(np.int16)
            buffer.write(pcm_data.tobytes())

        elif output_format == OutputFormat.FLAC:
            sf.write(buffer, audio, sample_rate, format='FLAC')

        elif output_format == OutputFormat.OGG:
            sf.write(buffer, audio, sample_rate, format='OGG')

        else:  # MP3 (default)
            # Write as WAV first, then convert to MP3
            wav_buffer = io.BytesIO()
            sf.write(wav_buffer, audio, sample_rate, format='WAV')
            wav_buffer.seek(0)

            # Convert to MP3 using pydub
            audio_segment = AudioSegment.from_wav(wav_buffer)
            audio_segment.export(buffer, format="mp3", bitrate="192k")

        buffer.seek(0)
        return buffer.read()

    def _split_into_sentences(self, text: str) -> list:
        """Split text into sentences for streaming"""
        import re
        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def get_available_voices(self) -> list:
        """Get list of available voices from the model"""
        if not self._initialized:
            return []

        try:
            if hasattr(self.model, 'speakers'):
                return list(self.model.speakers)
            elif hasattr(self.model, 'speaker_manager'):
                return list(self.model.speaker_manager.speaker_names)
        except Exception:
            pass

        return []

    def get_available_languages(self) -> list:
        """Get list of supported languages"""
        if not self._initialized:
            return ["en"]

        try:
            if hasattr(self.model, 'languages'):
                return list(self.model.languages)
        except Exception:
            pass

        # Default XTTS languages
        return [
            "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru",
            "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"
        ]


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get or create TTS service singleton"""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
