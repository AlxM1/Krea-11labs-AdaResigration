"""
Voice Isolation Service using Demucs
Separates vocals from background audio
"""
import os
import io
import tempfile
from typing import Optional, Tuple, Dict
from pathlib import Path
import numpy as np
import soundfile as sf
from pydub import AudioSegment

from app.core.config import settings
from app.schemas.audio import OutputFormat


class VoiceIsolationService:
    """
    Voice isolation service using Demucs.
    Separates vocals from background music/noise.
    """

    def __init__(self):
        self.device = settings.DEVICE
        self.model = None
        self._initialized = False
        self.sample_rate = 44100  # Demucs default

    async def initialize(self):
        """Initialize Demucs model (lazy loading)"""
        if self._initialized:
            return

        try:
            import torch
            import demucs.api

            print("Loading Demucs model...")
            self.separator = demucs.api.Separator(
                model="htdemucs",
                device=self.device
            )
            self._initialized = True
            print("Demucs model loaded successfully")

        except Exception as e:
            print(f"Failed to load Demucs: {e}")
            # Try alternative approach
            try:
                import torch
                from demucs import pretrained
                from demucs.apply import apply_model

                print("Trying alternative Demucs loading...")
                self.model = pretrained.get_model("htdemucs")
                self.model.to(self.device)
                self._use_apply_model = True
                self._initialized = True
                print("Demucs model loaded (alternative method)")

            except Exception as e2:
                print(f"All Demucs loading methods failed: {e2}")
                self._initialized = False

    async def isolate_voice(
        self,
        audio_data: bytes,
        output_format: OutputFormat = OutputFormat.MP3,
        return_background: bool = True
    ) -> Dict[str, bytes]:
        """
        Isolate voice from audio, separating vocals from background.

        Args:
            audio_data: Input audio bytes
            output_format: Output audio format
            return_background: Whether to return background audio as well

        Returns:
            Dict with 'vocals' and optionally 'background' audio bytes
        """
        if not self._initialized:
            await self.initialize()

        if not self._initialized:
            raise RuntimeError("Voice isolation model not available")

        # Save audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = tmp_file.name

            # Convert input to WAV
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            audio = audio.set_frame_rate(self.sample_rate)
            audio = audio.set_channels(2)  # Demucs expects stereo
            audio.export(tmp_path, format="wav")

        try:
            # Separate audio
            if hasattr(self, 'separator'):
                result = await self._separate_with_api(tmp_path)
            else:
                result = await self._separate_with_apply(tmp_path)

            # Convert results to output format
            output = {}

            if 'vocals' in result:
                output['vocals'] = self._convert_format(
                    result['vocals'], self.sample_rate, output_format
                )

            if return_background and 'background' in result:
                output['background'] = self._convert_format(
                    result['background'], self.sample_rate, output_format
                )

            # Get duration
            output['duration_seconds'] = len(result.get('vocals', result.get('background', []))) / self.sample_rate

            return output

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def _separate_with_api(self, audio_path: str) -> Dict[str, np.ndarray]:
        """Separate using Demucs API"""
        origin, separated = self.separator.separate_audio_file(audio_path)

        result = {}

        # Extract vocals
        if 'vocals' in separated:
            vocals = separated['vocals'].numpy()
            # Convert to mono and normalize
            if vocals.ndim > 1:
                vocals = vocals.mean(axis=0)
            result['vocals'] = vocals

        # Combine non-vocal stems for background
        background_stems = ['drums', 'bass', 'other']
        background = None
        for stem in background_stems:
            if stem in separated:
                stem_audio = separated[stem].numpy()
                if stem_audio.ndim > 1:
                    stem_audio = stem_audio.mean(axis=0)
                if background is None:
                    background = stem_audio
                else:
                    background = background + stem_audio

        if background is not None:
            result['background'] = background

        return result

    async def _separate_with_apply(self, audio_path: str) -> Dict[str, np.ndarray]:
        """Separate using apply_model directly"""
        import torch
        import torchaudio
        from demucs.apply import apply_model

        # Load audio
        waveform, sr = torchaudio.load(audio_path)

        # Resample if needed
        if sr != self.sample_rate:
            resampler = torchaudio.transforms.Resample(sr, self.sample_rate)
            waveform = resampler(waveform)

        # Ensure stereo
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)

        # Add batch dimension
        waveform = waveform.unsqueeze(0).to(self.device)

        # Apply model
        with torch.no_grad():
            sources = apply_model(self.model, waveform)

        # sources shape: (batch, sources, channels, samples)
        # htdemucs sources: drums, bass, other, vocals

        result = {}

        # Extract vocals (index 3 for htdemucs)
        vocals = sources[0, 3].cpu().numpy()
        if vocals.ndim > 1:
            vocals = vocals.mean(axis=0)
        result['vocals'] = vocals

        # Combine other sources for background
        background = sources[0, :3].sum(dim=0).cpu().numpy()
        if background.ndim > 1:
            background = background.mean(axis=0)
        result['background'] = background

        return result

    async def enhance_voice(
        self,
        audio_data: bytes,
        output_format: OutputFormat = OutputFormat.MP3
    ) -> bytes:
        """
        Enhance voice quality by isolating and cleaning.
        Removes background noise while preserving voice clarity.
        """
        # First, isolate voice
        result = await self.isolate_voice(
            audio_data,
            output_format=OutputFormat.WAV,
            return_background=False
        )

        vocals = result['vocals']

        # Apply additional noise reduction
        vocals = await self._apply_noise_reduction(vocals)

        # Convert to output format
        return self._convert_format(vocals, self.sample_rate, output_format)

    async def _apply_noise_reduction(self, audio: bytes) -> bytes:
        """Apply additional noise reduction to audio"""
        try:
            import noisereduce as nr

            # Load audio
            audio_segment = AudioSegment.from_file(io.BytesIO(audio))
            samples = np.array(audio_segment.get_array_of_samples()).astype(np.float32)
            samples = samples / 32768.0  # Normalize

            # Apply noise reduction
            reduced = nr.reduce_noise(
                y=samples,
                sr=audio_segment.frame_rate,
                stationary=True,
                prop_decrease=0.75
            )

            # Convert back
            reduced = (reduced * 32768).astype(np.int16)

            # Create new audio segment
            result = AudioSegment(
                reduced.tobytes(),
                frame_rate=audio_segment.frame_rate,
                sample_width=2,
                channels=1
            )

            output = io.BytesIO()
            result.export(output, format="wav")
            output.seek(0)
            return output.read()

        except Exception as e:
            print(f"Noise reduction failed: {e}")
            return audio

    def _convert_format(
        self,
        audio: np.ndarray,
        sample_rate: int,
        output_format: OutputFormat
    ) -> bytes:
        """Convert audio array to specified format"""
        # Normalize audio
        if audio.max() > 1.0 or audio.min() < -1.0:
            audio = audio / max(abs(audio.max()), abs(audio.min()))

        audio = np.clip(audio, -1.0, 1.0)

        buffer = io.BytesIO()

        if output_format == OutputFormat.WAV:
            sf.write(buffer, audio, sample_rate, format='WAV')

        elif output_format == OutputFormat.PCM:
            pcm_data = (audio * 32767).astype(np.int16)
            buffer.write(pcm_data.tobytes())

        elif output_format == OutputFormat.FLAC:
            sf.write(buffer, audio, sample_rate, format='FLAC')

        elif output_format == OutputFormat.OGG:
            sf.write(buffer, audio, sample_rate, format='OGG')

        else:  # MP3
            wav_buffer = io.BytesIO()
            sf.write(wav_buffer, audio, sample_rate, format='WAV')
            wav_buffer.seek(0)

            audio_segment = AudioSegment.from_wav(wav_buffer)
            audio_segment.export(buffer, format="mp3", bitrate="192k")

        buffer.seek(0)
        return buffer.read()


# Singleton instance
_isolation_service: Optional[VoiceIsolationService] = None


def get_isolation_service() -> VoiceIsolationService:
    """Get or create voice isolation service singleton"""
    global _isolation_service
    if _isolation_service is None:
        _isolation_service = VoiceIsolationService()
    return _isolation_service
