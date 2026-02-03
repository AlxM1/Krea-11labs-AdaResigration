"""
Remote GPU Worker Client
Allows VoiceForge backend to communicate with GPU worker running on Windows PC

This enables distributed deployment:
- Linux VM: Runs API server, Celery workers (CPU tasks)
- Windows PC: Runs GPU worker (TTS, STT, SFX, Isolation)
"""

import os
import io
import logging
from typing import Optional, List, Dict, Any, BinaryIO
from dataclasses import dataclass

import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class GPUWorkerConfig:
    """Configuration for remote GPU worker"""
    enabled: bool
    url: str
    timeout: float = 300.0  # 5 minutes for long tasks
    retry_attempts: int = 3


def get_gpu_worker_config() -> GPUWorkerConfig:
    """Get GPU worker configuration from environment"""
    mode = os.environ.get("GPU_WORKER_MODE", "local")
    url = os.environ.get("GPU_WORKER_URL", "http://localhost:8001")

    return GPUWorkerConfig(
        enabled=mode == "remote",
        url=url,
        timeout=float(os.environ.get("GPU_WORKER_TIMEOUT", "300")),
        retry_attempts=int(os.environ.get("GPU_WORKER_RETRY", "3"))
    )


class RemoteGPUClient:
    """
    Client for communicating with remote GPU worker.
    Provides async HTTP interface for voice AI operations.
    """

    def __init__(self, config: Optional[GPUWorkerConfig] = None):
        self.config = config or get_gpu_worker_config()
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.config.url,
                timeout=httpx.Timeout(self.config.timeout),
                follow_redirects=True
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def health_check(self) -> Dict[str, Any]:
        """Check GPU worker health"""
        try:
            client = await self._get_client()
            response = await client.get("/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"GPU worker health check failed: {e}")
            return {"status": "offline", "error": str(e)}

    async def generate_tts(
        self,
        text: str,
        language: str = "en",
        speaker_wav_url: Optional[str] = None,
        speed: float = 1.0,
        output_format: str = "wav"
    ) -> bytes:
        """
        Generate speech using remote GPU worker.

        Args:
            text: Text to synthesize
            language: Language code (default: en)
            speaker_wav_url: URL to reference audio for voice cloning
            speed: Speech speed multiplier
            output_format: Output audio format

        Returns:
            Audio bytes
        """
        if not self.config.enabled:
            raise RuntimeError("Remote GPU worker not enabled. Set GPU_WORKER_MODE=remote")

        client = await self._get_client()

        payload = {
            "text": text,
            "language": language,
            "speed": speed,
            "output_format": output_format
        }
        if speaker_wav_url:
            payload["speaker_wav_url"] = speaker_wav_url

        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.post("/tts/generate", json=payload)
                response.raise_for_status()
                return response.content
            except httpx.HTTPStatusError as e:
                logger.error(f"TTS generation failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise
            except httpx.RequestError as e:
                logger.error(f"TTS request failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise

    async def transcribe_audio(
        self,
        audio_data: bytes,
        filename: str = "audio.wav",
        language: Optional[str] = None,
        task: str = "transcribe"
    ) -> Dict[str, Any]:
        """
        Transcribe audio using remote GPU worker.

        Args:
            audio_data: Audio file bytes
            filename: Original filename (for extension detection)
            language: Language hint (optional)
            task: 'transcribe' or 'translate'

        Returns:
            Transcription result with text, language, segments, duration
        """
        if not self.config.enabled:
            raise RuntimeError("Remote GPU worker not enabled")

        client = await self._get_client()

        files = {"audio": (filename, io.BytesIO(audio_data))}
        data = {"task": task}
        if language:
            data["language"] = language

        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.post(
                    "/stt/transcribe",
                    files=files,
                    data=data
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"STT transcription failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise
            except httpx.RequestError as e:
                logger.error(f"STT request failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise

    async def generate_sound_effect(
        self,
        prompt: str,
        duration: float = 5.0,
        num_inference_steps: int = 100
    ) -> bytes:
        """
        Generate sound effect using remote GPU worker.

        Args:
            prompt: Text description of desired sound
            duration: Duration in seconds (1-30)
            num_inference_steps: Quality/speed tradeoff

        Returns:
            Audio bytes
        """
        if not self.config.enabled:
            raise RuntimeError("Remote GPU worker not enabled")

        client = await self._get_client()

        payload = {
            "prompt": prompt,
            "duration": duration,
            "num_inference_steps": num_inference_steps
        }

        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.post("/sfx/generate", json=payload)
                response.raise_for_status()
                return response.content
            except Exception as e:
                logger.error(f"SFX generation failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise

    async def isolate_vocals(
        self,
        audio_data: bytes,
        filename: str = "audio.wav",
        stems: str = "vocals,no_vocals"
    ) -> bytes:
        """
        Separate vocals from audio using remote GPU worker.

        Args:
            audio_data: Audio file bytes
            filename: Original filename
            stems: Which stems to return (vocals, no_vocals)

        Returns:
            Audio bytes (vocals by default)
        """
        if not self.config.enabled:
            raise RuntimeError("Remote GPU worker not enabled")

        client = await self._get_client()

        files = {"audio": (filename, io.BytesIO(audio_data))}
        data = {"stems": stems}

        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.post(
                    "/isolation/separate",
                    files=files,
                    data=data
                )
                response.raise_for_status()
                return response.content
            except Exception as e:
                logger.error(f"Voice isolation failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise

    async def clone_voice(
        self,
        audio_files: List[bytes],
        filenames: List[str],
        voice_name: str
    ) -> bytes:
        """
        Create voice clone from reference audio.

        Args:
            audio_files: List of audio file bytes
            filenames: Original filenames
            voice_name: Name for the cloned voice

        Returns:
            Combined reference audio bytes
        """
        if not self.config.enabled:
            raise RuntimeError("Remote GPU worker not enabled")

        client = await self._get_client()

        files = [
            ("audio_files", (fn, io.BytesIO(data)))
            for fn, data in zip(filenames, audio_files)
        ]
        data = {"voice_name": voice_name}

        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.post(
                    "/voice/clone",
                    files=files,
                    data=data
                )
                response.raise_for_status()
                return response.content
            except Exception as e:
                logger.error(f"Voice cloning failed (attempt {attempt + 1}): {e}")
                if attempt == self.config.retry_attempts - 1:
                    raise

    async def preload_models(self) -> Dict[str, Any]:
        """Request GPU worker to preload all models"""
        if not self.config.enabled:
            return {"status": "disabled"}

        try:
            client = await self._get_client()
            response = await client.get("/models/preload")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Model preload request failed: {e}")
            return {"status": "error", "error": str(e)}

    async def get_gpu_info(self) -> Dict[str, Any]:
        """Get GPU information from worker"""
        if not self.config.enabled:
            return {"status": "disabled"}

        try:
            client = await self._get_client()
            response = await client.get("/gpu/info")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"GPU info request failed: {e}")
            return {"status": "error", "error": str(e)}


# Singleton instance
_gpu_client: Optional[RemoteGPUClient] = None


def get_gpu_client() -> RemoteGPUClient:
    """Get or create GPU client singleton"""
    global _gpu_client
    if _gpu_client is None:
        _gpu_client = RemoteGPUClient()
    return _gpu_client


def is_remote_gpu_enabled() -> bool:
    """Check if remote GPU mode is enabled"""
    return get_gpu_worker_config().enabled
