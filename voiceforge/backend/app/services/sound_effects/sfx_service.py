"""
Sound Effects Generation Service using AudioLDM
"""
import os
import io
import tempfile
from typing import Optional, Tuple
import numpy as np
import soundfile as sf
from pydub import AudioSegment

from app.core.config import settings
from app.schemas.audio import OutputFormat


class SoundEffectService:
    """
    Sound effect generation service using AudioLDM or similar models.
    Generates audio from text prompts.
    """

    def __init__(self):
        self.device = settings.DEVICE
        self.model = None
        self._initialized = False
        self.sample_rate = 16000  # AudioLDM default

    async def initialize(self):
        """Initialize sound effect model (lazy loading)"""
        if self._initialized:
            return

        try:
            from diffusers import AudioLDM2Pipeline
            import torch

            print("Loading AudioLDM2 model...")
            self.model = AudioLDM2Pipeline.from_pretrained(
                "cvssp/audioldm2",
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            self.model = self.model.to(self.device)

            # Enable memory optimizations
            if self.device == "cuda":
                self.model.enable_model_cpu_offload()

            self._initialized = True
            print("AudioLDM2 model loaded successfully")

        except Exception as e:
            print(f"Failed to load AudioLDM2: {e}")
            # Try AudioLDM (v1) as fallback
            try:
                from diffusers import AudioLDMPipeline
                import torch

                print("Trying AudioLDM (v1) as fallback...")
                self.model = AudioLDMPipeline.from_pretrained(
                    "cvssp/audioldm-s-full-v2",
                    torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
                )
                self.model = self.model.to(self.device)
                self._initialized = True
                print("AudioLDM model loaded successfully")

            except Exception as e2:
                print(f"Both AudioLDM models failed: {e2}")
                self._initialized = False

    async def generate(
        self,
        prompt: str,
        duration_seconds: float = 5.0,
        num_inference_steps: int = 50,
        guidance_scale: float = 3.5,
        negative_prompt: Optional[str] = None,
        output_format: OutputFormat = OutputFormat.MP3
    ) -> Tuple[bytes, float]:
        """
        Generate sound effect from text prompt.

        Args:
            prompt: Text description of the sound effect
            duration_seconds: Duration of generated audio (max 30 seconds)
            num_inference_steps: Number of denoising steps (higher = better quality)
            guidance_scale: How closely to follow the prompt
            negative_prompt: What to avoid in the generation
            output_format: Output audio format

        Returns:
            Tuple of (audio_bytes, actual_duration)
        """
        if not self._initialized:
            await self.initialize()

        if not self._initialized:
            raise RuntimeError("Sound effect model not available")

        # Clamp duration
        duration_seconds = min(max(duration_seconds, 0.5), 30.0)

        # Calculate audio length in samples
        # AudioLDM generates in fixed increments
        audio_length = int(duration_seconds * self.sample_rate)

        try:
            # Generate audio
            if negative_prompt is None:
                negative_prompt = "low quality, noise, distortion"

            audio = self.model(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                audio_length_in_s=duration_seconds
            ).audios[0]

            # audio is a numpy array
            actual_duration = len(audio) / self.sample_rate

            # Convert to output format
            audio_bytes = self._convert_format(audio, self.sample_rate, output_format)

            return audio_bytes, actual_duration

        except Exception as e:
            raise RuntimeError(f"Sound effect generation failed: {str(e)}")

    async def generate_looping(
        self,
        prompt: str,
        duration_seconds: float = 5.0,
        output_format: OutputFormat = OutputFormat.MP3
    ) -> Tuple[bytes, float]:
        """
        Generate a looping sound effect (seamless loop).
        """
        # Generate slightly longer audio
        audio_bytes, duration = await self.generate(
            prompt=prompt,
            duration_seconds=duration_seconds + 0.5,
            output_format=OutputFormat.WAV  # Process as WAV first
        )

        # Create seamless loop using crossfade
        audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))

        # Crossfade duration (in milliseconds)
        crossfade_ms = 500

        # Trim to exact duration and apply crossfade
        target_ms = int(duration_seconds * 1000)
        if len(audio) > target_ms:
            audio = audio[:target_ms]

        # Create loop by crossfading end with beginning
        looped = audio.fade_in(crossfade_ms).fade_out(crossfade_ms)

        # Export to desired format
        output = io.BytesIO()
        format_str = "mp3" if output_format == OutputFormat.MP3 else output_format.value
        looped.export(output, format=format_str)
        output.seek(0)

        return output.read(), duration_seconds

    async def generate_from_video(
        self,
        video_data: bytes,
        prompt_hint: Optional[str] = None
    ) -> Tuple[bytes, float]:
        """
        Generate sound effects to match video content.
        This is a simplified implementation - full version would use
        video analysis models.
        """
        # Extract video frames and analyze (placeholder)
        # In production, would use video understanding models

        # For now, generate based on prompt hint
        if prompt_hint:
            return await self.generate(prompt=prompt_hint)

        # Default ambient sound
        return await self.generate(prompt="ambient background atmosphere")

    def _convert_format(
        self,
        audio: np.ndarray,
        sample_rate: int,
        output_format: OutputFormat
    ) -> bytes:
        """Convert audio array to specified format"""
        # Ensure audio is in correct range
        if audio.dtype == np.float64 or audio.dtype == np.float32:
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

    def get_suggested_prompts(self) -> list:
        """Get list of suggested sound effect prompts"""
        return [
            # Nature
            "rain falling on a window",
            "thunder in the distance",
            "birds chirping in a forest",
            "ocean waves on a beach",
            "wind blowing through trees",

            # Urban
            "city traffic with car horns",
            "footsteps on a wooden floor",
            "door creaking open",
            "elevator ding",
            "keyboard typing",

            # Action
            "explosion in the distance",
            "sword clashing",
            "gunshot echo",
            "glass breaking",
            "car engine revving",

            # Ambient
            "coffee shop ambiance",
            "office background noise",
            "restaurant chatter",
            "library quiet ambiance",
            "spaceship interior hum",

            # Electronic
            "sci-fi computer beep",
            "futuristic whoosh",
            "digital glitch",
            "retro game sound effect",
            "notification chime"
        ]


# Singleton instance
_sfx_service: Optional[SoundEffectService] = None


def get_sfx_service() -> SoundEffectService:
    """Get or create sound effect service singleton"""
    global _sfx_service
    if _sfx_service is None:
        _sfx_service = SoundEffectService()
    return _sfx_service
