"""
Voice Cloning Service
Supports instant voice cloning from short audio samples
"""
import os
import io
import shutil
import hashlib
import tempfile
from typing import Optional, Dict, Tuple
from pathlib import Path
import soundfile as sf
import numpy as np
from pydub import AudioSegment

from app.core.config import settings


class VoiceCloneService:
    """
    Voice cloning service supporting:
    - Instant voice cloning (5-60 seconds of audio)
    - Professional voice cloning (30+ minutes, requires training)
    """

    def __init__(self):
        self.voices_dir = Path(settings.STORAGE_PATH) / "voices"
        self.voices_dir.mkdir(parents=True, exist_ok=True)
        self.device = settings.DEVICE

    async def create_instant_clone(
        self,
        audio_data: bytes,
        name: str,
        user_id: str,
        description: Optional[str] = None,
        labels: Optional[Dict] = None
    ) -> Dict:
        """
        Create an instant voice clone from audio sample.

        Args:
            audio_data: Raw audio bytes
            name: Name for the voice
            user_id: User ID who owns this voice
            description: Optional description
            labels: Optional labels/tags

        Returns:
            Voice metadata dict with voice_id
        """
        # Generate unique voice ID
        voice_id = self._generate_voice_id(audio_data, user_id)

        # Create voice directory
        voice_dir = self.voices_dir / voice_id
        voice_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Save reference audio
            reference_path = voice_dir / "reference.wav"
            processed_audio = await self._process_reference_audio(audio_data)

            with open(reference_path, "wb") as f:
                f.write(processed_audio)

            # Validate audio duration
            duration = self._get_audio_duration(processed_audio)

            if duration < settings.MIN_CLONE_AUDIO_SECONDS:
                raise ValueError(
                    f"Audio too short. Minimum {settings.MIN_CLONE_AUDIO_SECONDS} seconds required, "
                    f"got {duration:.1f} seconds"
                )

            if duration > settings.MAX_CLONE_AUDIO_SECONDS:
                raise ValueError(
                    f"Audio too long. Maximum {settings.MAX_CLONE_AUDIO_SECONDS} seconds allowed, "
                    f"got {duration:.1f} seconds"
                )

            # Extract voice embedding (for future model compatibility)
            embedding = await self._extract_voice_embedding(str(reference_path))
            if embedding is not None:
                embedding_path = voice_dir / "embedding.npy"
                np.save(embedding_path, embedding)

            # Generate preview (first 10 seconds)
            preview_path = voice_dir / "preview.mp3"
            await self._create_preview(str(reference_path), str(preview_path))

            # Save metadata
            metadata = {
                "voice_id": voice_id,
                "name": name,
                "user_id": user_id,
                "description": description,
                "labels": labels or {},
                "clone_type": "instant",
                "duration_seconds": duration,
                "reference_path": str(reference_path),
                "preview_path": str(preview_path),
                "category": "cloned",
                "language": self._detect_language(str(reference_path))
            }

            metadata_path = voice_dir / "metadata.json"
            import json
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

            return metadata

        except Exception as e:
            # Cleanup on failure
            if voice_dir.exists():
                shutil.rmtree(voice_dir)
            raise Exception(f"Voice cloning failed: {str(e)}")

    async def create_professional_clone(
        self,
        audio_files: list,
        name: str,
        user_id: str,
        description: Optional[str] = None,
        labels: Optional[Dict] = None
    ) -> Dict:
        """
        Create a professional voice clone from multiple audio samples.
        This requires significantly more audio and trains a dedicated model.

        Note: Full implementation would require GPU training infrastructure.
        This is a placeholder for the API structure.
        """
        # Calculate total duration
        total_duration = 0
        for audio_data in audio_files:
            total_duration += self._get_audio_duration(audio_data)

        if total_duration < 30 * 60:  # 30 minutes minimum
            raise ValueError(
                f"Professional cloning requires at least 30 minutes of audio. "
                f"Got {total_duration / 60:.1f} minutes"
            )

        # Generate voice ID
        combined_hash = hashlib.sha256()
        for audio_data in audio_files:
            combined_hash.update(audio_data)
        voice_id = f"pvc_{combined_hash.hexdigest()[:16]}"

        # Create voice directory
        voice_dir = self.voices_dir / voice_id
        voice_dir.mkdir(parents=True, exist_ok=True)

        # Save all reference audio files
        for i, audio_data in enumerate(audio_files):
            ref_path = voice_dir / f"reference_{i:03d}.wav"
            processed = await self._process_reference_audio(audio_data)
            with open(ref_path, "wb") as f:
                f.write(processed)

        # TODO: Queue training job for professional voice clone
        # This would typically be handled by a background worker with GPU access

        metadata = {
            "voice_id": voice_id,
            "name": name,
            "user_id": user_id,
            "description": description,
            "labels": labels or {},
            "clone_type": "professional",
            "status": "training_queued",
            "total_duration_seconds": total_duration,
            "category": "professional"
        }

        return metadata

    async def _process_reference_audio(self, audio_data: bytes) -> bytes:
        """
        Process reference audio for voice cloning:
        - Convert to WAV
        - Normalize sample rate to 22050 Hz
        - Normalize audio levels
        - Remove silence
        """
        # Load audio using pydub (handles multiple formats)
        audio = AudioSegment.from_file(io.BytesIO(audio_data))

        # Convert to mono
        if audio.channels > 1:
            audio = audio.set_channels(1)

        # Set sample rate
        audio = audio.set_frame_rate(22050)

        # Normalize audio
        audio = audio.normalize()

        # Remove leading/trailing silence
        audio = self._strip_silence(audio)

        # Export as WAV
        output = io.BytesIO()
        audio.export(output, format="wav")
        output.seek(0)

        return output.read()

    def _strip_silence(
        self,
        audio: AudioSegment,
        silence_thresh: int = -40,
        chunk_size: int = 10
    ) -> AudioSegment:
        """Remove silence from beginning and end of audio"""
        from pydub.silence import detect_leading_silence

        start_trim = detect_leading_silence(audio, silence_threshold=silence_thresh, chunk_size=chunk_size)
        end_trim = detect_leading_silence(audio.reverse(), silence_threshold=silence_thresh, chunk_size=chunk_size)

        duration = len(audio)
        trimmed = audio[start_trim:duration - end_trim]

        return trimmed if len(trimmed) > 0 else audio

    async def _extract_voice_embedding(self, audio_path: str) -> Optional[np.ndarray]:
        """
        Extract voice embedding/characteristics for the voice.
        This can be used for voice similarity matching and model selection.
        """
        try:
            # Using a speaker embedding model
            # This is a simplified version - production would use specialized models
            from TTS.api import TTS

            # XTTS can extract speaker embeddings
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

            if hasattr(tts, 'synthesizer') and hasattr(tts.synthesizer, 'tts_model'):
                model = tts.synthesizer.tts_model
                if hasattr(model, 'speaker_manager'):
                    # Extract embedding
                    embedding = model.speaker_manager.compute_embedding_from_clip(audio_path)
                    return embedding

        except Exception as e:
            print(f"Could not extract voice embedding: {e}")

        return None

    async def _create_preview(
        self,
        reference_path: str,
        preview_path: str,
        max_duration: int = 10
    ):
        """Create a short preview clip from reference audio"""
        audio = AudioSegment.from_file(reference_path)

        # Limit to max_duration seconds
        if len(audio) > max_duration * 1000:
            audio = audio[:max_duration * 1000]

        # Fade in/out
        audio = audio.fade_in(100).fade_out(100)

        # Export as MP3
        audio.export(preview_path, format="mp3", bitrate="128k")

    def _get_audio_duration(self, audio_data: bytes) -> float:
        """Get duration of audio in seconds"""
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
        return len(audio) / 1000.0

    def _detect_language(self, audio_path: str) -> Optional[str]:
        """Detect language of spoken audio (placeholder)"""
        # In production, would use a language detection model
        # For now, return None (will be detected during TTS)
        return None

    def _generate_voice_id(self, audio_data: bytes, user_id: str) -> str:
        """Generate unique voice ID"""
        hash_input = audio_data + user_id.encode()
        return f"vc_{hashlib.sha256(hash_input).hexdigest()[:16]}"

    async def get_voice(self, voice_id: str) -> Optional[Dict]:
        """Get voice metadata by ID"""
        voice_dir = self.voices_dir / voice_id
        metadata_path = voice_dir / "metadata.json"

        if not metadata_path.exists():
            return None

        import json
        with open(metadata_path, "r") as f:
            return json.load(f)

    async def delete_voice(self, voice_id: str, user_id: str) -> bool:
        """Delete a voice clone"""
        voice = await self.get_voice(voice_id)
        if voice is None:
            return False

        if voice.get("user_id") != user_id:
            raise PermissionError("Cannot delete voice owned by another user")

        voice_dir = self.voices_dir / voice_id
        if voice_dir.exists():
            shutil.rmtree(voice_dir)

        return True

    async def list_voices(self, user_id: str) -> list:
        """List all voices for a user"""
        voices = []

        for voice_dir in self.voices_dir.iterdir():
            if voice_dir.is_dir():
                metadata_path = voice_dir / "metadata.json"
                if metadata_path.exists():
                    import json
                    with open(metadata_path, "r") as f:
                        voice = json.load(f)
                        if voice.get("user_id") == user_id:
                            voices.append(voice)

        return voices


# Singleton instance
_clone_service: Optional[VoiceCloneService] = None


def get_clone_service() -> VoiceCloneService:
    """Get or create voice clone service singleton"""
    global _clone_service
    if _clone_service is None:
        _clone_service = VoiceCloneService()
    return _clone_service
