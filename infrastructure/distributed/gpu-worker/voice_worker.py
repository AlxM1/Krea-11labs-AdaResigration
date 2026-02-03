"""
11labs GPU Worker
Runs on Windows PC with RTX 5090 to handle voice AI processing
Exposes HTTP API for the Linux VM to call

Services provided:
- Text-to-Speech (XTTS v2)
- Speech-to-Text (Whisper)
- Voice Cloning
- Sound Effects Generation (AudioLDM)
- Voice Isolation (Demucs)
"""

import os
import io
import tempfile
import logging
from typing import Optional, List
from pathlib import Path
from contextlib import asynccontextmanager

import torch
import torchaudio
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# Configuration
# ============================================
class Config:
    # Device configuration
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

    # Model paths
    MODELS_CACHE = os.environ.get("MODELS_CACHE", "./models")

    # TTS Configuration
    TTS_MODEL = os.environ.get("TTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")

    # STT Configuration
    WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3")

    # Sound Effects Configuration
    SFX_MODEL = os.environ.get("SFX_MODEL", "audioldm2-full-large-1150k")

    # Server Configuration
    HOST = os.environ.get("HOST", "0.0.0.0")
    PORT = int(os.environ.get("PORT", "8001"))

config = Config()

# ============================================
# Models (lazy loaded)
# ============================================
class ModelManager:
    """Manages AI models with lazy loading"""

    def __init__(self):
        self._tts_model = None
        self._whisper_model = None
        self._sfx_model = None
        self._demucs_model = None

    @property
    def tts(self):
        """Get TTS model (XTTS v2)"""
        if self._tts_model is None:
            logger.info("Loading TTS model (XTTS v2)...")
            from TTS.api import TTS
            self._tts_model = TTS(config.TTS_MODEL).to(config.DEVICE)
            logger.info(f"TTS model loaded on {config.DEVICE}")
        return self._tts_model

    @property
    def whisper(self):
        """Get Whisper model for STT"""
        if self._whisper_model is None:
            logger.info(f"Loading Whisper model ({config.WHISPER_MODEL})...")
            import whisper
            self._whisper_model = whisper.load_model(config.WHISPER_MODEL, device=config.DEVICE)
            logger.info(f"Whisper model loaded on {config.DEVICE}")
        return self._whisper_model

    @property
    def sfx(self):
        """Get AudioLDM model for sound effects"""
        if self._sfx_model is None:
            logger.info("Loading AudioLDM model for sound effects...")
            from diffusers import AudioLDM2Pipeline
            self._sfx_model = AudioLDM2Pipeline.from_pretrained(
                f"cvssp/{config.SFX_MODEL}",
                torch_dtype=torch.float16 if config.DEVICE == "cuda" else torch.float32
            ).to(config.DEVICE)
            logger.info(f"AudioLDM model loaded on {config.DEVICE}")
        return self._sfx_model

    @property
    def demucs(self):
        """Get Demucs model for voice isolation"""
        if self._demucs_model is None:
            logger.info("Loading Demucs model for voice isolation...")
            from demucs.pretrained import get_model
            from demucs.apply import apply_model
            self._demucs_model = get_model("htdemucs")
            self._demucs_model.to(config.DEVICE)
            logger.info(f"Demucs model loaded on {config.DEVICE}")
        return self._demucs_model

    def get_gpu_info(self):
        """Get GPU information"""
        if not torch.cuda.is_available():
            return {"available": False, "device": "cpu"}

        return {
            "available": True,
            "device": torch.cuda.get_device_name(0),
            "memory_total": torch.cuda.get_device_properties(0).total_memory // (1024**3),
            "memory_allocated": torch.cuda.memory_allocated(0) // (1024**3),
            "memory_cached": torch.cuda.memory_reserved(0) // (1024**3),
        }

models = ModelManager()

# ============================================
# Request/Response Models
# ============================================
class TTSRequest(BaseModel):
    text: str = Field(..., max_length=5000)
    language: str = "en"
    speaker_wav_url: Optional[str] = None
    speed: float = 1.0
    output_format: str = "wav"

class STTResponse(BaseModel):
    text: str
    language: str
    segments: Optional[List[dict]] = None
    duration: float

class SFXRequest(BaseModel):
    prompt: str = Field(..., max_length=500)
    duration: float = Field(default=5.0, ge=1.0, le=30.0)
    num_inference_steps: int = Field(default=100, ge=10, le=200)

class IsolationResponse(BaseModel):
    vocals_url: str
    accompaniment_url: str
    duration: float

class HealthResponse(BaseModel):
    status: str
    gpu: dict
    models_loaded: dict

# ============================================
# FastAPI Application
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info(f"Starting 11labs GPU Worker on {config.DEVICE}")
    logger.info(f"GPU Info: {models.get_gpu_info()}")
    yield
    logger.info("Shutting down 11labs GPU Worker")

app = FastAPI(
    title="11labs GPU Worker",
    description="GPU-accelerated voice AI processing service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for cross-origin requests from Linux VM
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# API Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        gpu=models.get_gpu_info(),
        models_loaded={
            "tts": models._tts_model is not None,
            "whisper": models._whisper_model is not None,
            "sfx": models._sfx_model is not None,
            "demucs": models._demucs_model is not None,
        }
    )

@app.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    """Generate speech from text using XTTS v2"""
    try:
        logger.info(f"TTS request: {len(request.text)} characters, language={request.language}")

        # Prepare output
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            output_path = tmp.name

        # Generate speech
        if request.speaker_wav_url:
            # Clone voice from reference audio
            import requests as http_requests
            ref_response = http_requests.get(request.speaker_wav_url)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref_tmp:
                ref_tmp.write(ref_response.content)
                ref_path = ref_tmp.name

            models.tts.tts_to_file(
                text=request.text,
                speaker_wav=ref_path,
                language=request.language,
                file_path=output_path,
                speed=request.speed
            )
            os.unlink(ref_path)
        else:
            # Use default speaker
            models.tts.tts_to_file(
                text=request.text,
                language=request.language,
                file_path=output_path,
                speed=request.speed
            )

        # Read output and return
        with open(output_path, "rb") as f:
            audio_data = f.read()
        os.unlink(output_path)

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=tts_output.wav"}
        )

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stt/transcribe", response_model=STTResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    task: str = Form("transcribe")  # transcribe or translate
):
    """Transcribe audio using Whisper"""
    try:
        logger.info(f"STT request: {audio.filename}, task={task}")

        # Save uploaded audio
        with tempfile.NamedTemporaryFile(suffix=Path(audio.filename).suffix, delete=False) as tmp:
            content = await audio.read()
            tmp.write(content)
            audio_path = tmp.name

        # Transcribe
        result = models.whisper.transcribe(
            audio_path,
            language=language,
            task=task
        )

        os.unlink(audio_path)

        # Get duration
        waveform, sample_rate = torchaudio.load(audio_path) if os.path.exists(audio_path) else (None, None)
        duration = result["segments"][-1]["end"] if result["segments"] else 0

        return STTResponse(
            text=result["text"],
            language=result.get("language", language or "unknown"),
            segments=result.get("segments"),
            duration=duration
        )

    except Exception as e:
        logger.error(f"STT transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sfx/generate")
async def generate_sound_effect(request: SFXRequest):
    """Generate sound effects using AudioLDM"""
    try:
        logger.info(f"SFX request: {request.prompt[:50]}...")

        # Generate audio
        audio = models.sfx(
            request.prompt,
            num_inference_steps=request.num_inference_steps,
            audio_length_in_s=request.duration,
        ).audios[0]

        # Convert to wav
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            import scipy.io.wavfile as wavfile
            wavfile.write(tmp.name, 16000, audio)
            with open(tmp.name, "rb") as f:
                audio_data = f.read()
            os.unlink(tmp.name)

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=sfx_output.wav"}
        )

    except Exception as e:
        logger.error(f"SFX generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/isolation/separate")
async def isolate_vocals(
    audio: UploadFile = File(...),
    stems: str = Form("vocals,no_vocals")  # Which stems to return
):
    """Separate vocals from audio using Demucs"""
    try:
        logger.info(f"Isolation request: {audio.filename}")

        # Save uploaded audio
        with tempfile.NamedTemporaryFile(suffix=Path(audio.filename).suffix, delete=False) as tmp:
            content = await audio.read()
            tmp.write(content)
            audio_path = tmp.name

        # Load audio
        waveform, sample_rate = torchaudio.load(audio_path)

        # Resample if needed
        if sample_rate != 44100:
            resampler = torchaudio.transforms.Resample(sample_rate, 44100)
            waveform = resampler(waveform)
            sample_rate = 44100

        # Apply Demucs
        from demucs.apply import apply_model

        # Ensure stereo
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)

        # Add batch dimension
        waveform = waveform.unsqueeze(0).to(config.DEVICE)

        # Separate
        with torch.no_grad():
            sources = apply_model(models.demucs, waveform, device=config.DEVICE)

        # Demucs outputs: drums, bass, other, vocals
        sources = sources.squeeze(0)
        vocals = sources[3]  # vocals
        accompaniment = sources[0] + sources[1] + sources[2]  # drums + bass + other

        # Save stems
        output_files = {}
        requested_stems = stems.split(",")

        with tempfile.TemporaryDirectory() as tmpdir:
            if "vocals" in requested_stems:
                vocals_path = os.path.join(tmpdir, "vocals.wav")
                torchaudio.save(vocals_path, vocals.cpu(), sample_rate)
                with open(vocals_path, "rb") as f:
                    output_files["vocals"] = f.read()

            if "no_vocals" in requested_stems or "accompaniment" in requested_stems:
                acc_path = os.path.join(tmpdir, "accompaniment.wav")
                torchaudio.save(acc_path, accompaniment.cpu(), sample_rate)
                with open(acc_path, "rb") as f:
                    output_files["accompaniment"] = f.read()

        os.unlink(audio_path)

        # Return vocals by default
        return StreamingResponse(
            io.BytesIO(output_files.get("vocals", output_files.get("accompaniment"))),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=isolated.wav"}
        )

    except Exception as e:
        logger.error(f"Voice isolation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/clone")
async def clone_voice(
    audio_files: List[UploadFile] = File(...),
    voice_name: str = Form(...),
):
    """Create a voice embedding from reference audio"""
    try:
        logger.info(f"Voice clone request: {voice_name}, {len(audio_files)} files")

        # Save uploaded files
        audio_paths = []
        for audio in audio_files:
            with tempfile.NamedTemporaryFile(suffix=Path(audio.filename).suffix, delete=False) as tmp:
                content = await audio.read()
                tmp.write(content)
                audio_paths.append(tmp.name)

        # For XTTS v2, we just need the reference audio path
        # The actual cloning happens at inference time
        # Return the combined audio that can be used as reference

        # Concatenate all audio files
        waveforms = []
        sample_rate = None
        for path in audio_paths:
            wf, sr = torchaudio.load(path)
            if sample_rate is None:
                sample_rate = sr
            elif sr != sample_rate:
                resampler = torchaudio.transforms.Resample(sr, sample_rate)
                wf = resampler(wf)
            waveforms.append(wf)

        combined = torch.cat(waveforms, dim=1)

        # Save combined audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            torchaudio.save(tmp.name, combined, sample_rate)
            with open(tmp.name, "rb") as f:
                audio_data = f.read()
            os.unlink(tmp.name)

        # Cleanup
        for path in audio_paths:
            os.unlink(path)

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename={voice_name}_reference.wav",
                "X-Voice-Name": voice_name
            }
        )

    except Exception as e:
        logger.error(f"Voice cloning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/preload")
async def preload_models(background_tasks: BackgroundTasks):
    """Preload all models in background"""
    def load_all():
        _ = models.tts
        _ = models.whisper
        _ = models.sfx
        _ = models.demucs

    background_tasks.add_task(load_all)
    return {"status": "preloading", "message": "Models are being loaded in background"}

@app.get("/gpu/info")
async def get_gpu_info():
    """Get detailed GPU information"""
    info = models.get_gpu_info()

    if torch.cuda.is_available():
        info.update({
            "cuda_version": torch.version.cuda,
            "cudnn_version": torch.backends.cudnn.version(),
            "pytorch_version": torch.__version__,
        })

    return info

# ============================================
# Main Entry Point
# ============================================
if __name__ == "__main__":
    uvicorn.run(
        "voice_worker:app",
        host=config.HOST,
        port=config.PORT,
        reload=False,
        workers=1,  # Single worker for GPU memory management
        log_level="info"
    )
