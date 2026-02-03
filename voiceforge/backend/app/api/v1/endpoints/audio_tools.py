"""
Audio Tools API endpoints (Voice Isolation, Enhancement, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import io

from app.schemas.audio import VoiceIsolationResponse, OutputFormat
from app.services.voice_isolation.isolation_service import get_isolation_service
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/audio-isolation", response_model=VoiceIsolationResponse)
async def isolate_voice(
    file: UploadFile = File(..., description="Audio file to process"),
    output_format: OutputFormat = Form(OutputFormat.MP3),
    include_background: bool = Form(True, description="Return background audio as well"),
    current_user: dict = Depends(get_current_user)
):
    """
    Isolate voice from background audio.

    Separates vocals from music, noise, and other background sounds.
    Useful for:
    - Cleaning up interviews with background noise
    - Extracting vocals from songs
    - Creating clean voice recordings from noisy environments

    Returns both the isolated vocals and (optionally) the background audio.
    """
    isolation_service = get_isolation_service()

    # Validate file format
    allowed_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.m4a'}
    ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed: {', '.join(allowed_extensions)}"
        )

    # Check file size
    content = await file.read()
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit"
        )

    try:
        result = await isolation_service.isolate_voice(
            audio_data=content,
            output_format=output_format,
            return_background=include_background
        )

        return VoiceIsolationResponse(
            vocals_url="/api/v1/audio/isolated/vocals",  # Placeholder
            background_url="/api/v1/audio/isolated/background" if include_background else None,
            duration_seconds=result.get("duration_seconds", 0)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio-isolation/stream")
async def isolate_voice_stream(
    file: UploadFile = File(..., description="Audio file to process"),
    component: str = Form("vocals", description="Component to return: 'vocals' or 'background'"),
    output_format: OutputFormat = Form(OutputFormat.MP3),
    current_user: dict = Depends(get_current_user)
):
    """
    Isolate voice and stream the result directly.
    """
    isolation_service = get_isolation_service()

    content = await file.read()

    try:
        result = await isolation_service.isolate_voice(
            audio_data=content,
            output_format=output_format,
            return_background=(component == "background")
        )

        audio_key = "vocals" if component == "vocals" else "background"

        if audio_key not in result:
            raise HTTPException(status_code=400, detail=f"Component '{component}' not available")

        content_type = {
            OutputFormat.MP3: "audio/mpeg",
            OutputFormat.WAV: "audio/wav",
            OutputFormat.FLAC: "audio/flac",
            OutputFormat.OGG: "audio/ogg"
        }.get(output_format, "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(result[audio_key]),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={audio_key}.{output_format.value}",
                "X-Duration-Seconds": str(result.get("duration_seconds", 0))
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio-enhance")
async def enhance_voice(
    file: UploadFile = File(..., description="Audio file to enhance"),
    output_format: OutputFormat = Form(OutputFormat.MP3),
    current_user: dict = Depends(get_current_user)
):
    """
    Enhance voice quality by removing background noise.

    Uses voice isolation + noise reduction to produce cleaner audio.
    """
    isolation_service = get_isolation_service()

    content = await file.read()

    try:
        enhanced = await isolation_service.enhance_voice(
            audio_data=content,
            output_format=output_format
        )

        content_type = {
            OutputFormat.MP3: "audio/mpeg",
            OutputFormat.WAV: "audio/wav"
        }.get(output_format, "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(enhanced),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=enhanced.{output_format.value}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio-info")
async def get_audio_info(
    file: UploadFile = File(..., description="Audio file to analyze"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about an audio file.
    Returns duration, sample rate, channels, format, and file size.
    """
    from pydub import AudioSegment
    import io

    content = await file.read()

    try:
        audio = AudioSegment.from_file(io.BytesIO(content))

        return {
            "filename": file.filename,
            "duration_seconds": len(audio) / 1000.0,
            "sample_rate": audio.frame_rate,
            "channels": audio.channels,
            "sample_width_bytes": audio.sample_width,
            "frame_count": audio.frame_count(),
            "file_size_bytes": len(content),
            "file_size_mb": round(len(content) / (1024 * 1024), 2)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not analyze audio: {str(e)}")


@router.post("/audio-convert")
async def convert_audio(
    file: UploadFile = File(..., description="Audio file to convert"),
    output_format: OutputFormat = Form(..., description="Target format"),
    sample_rate: Optional[int] = Form(None, description="Target sample rate"),
    channels: Optional[int] = Form(None, description="Number of channels (1=mono, 2=stereo)"),
    bitrate: Optional[str] = Form(None, description="Bitrate for compressed formats (e.g., '192k')"),
    current_user: dict = Depends(get_current_user)
):
    """
    Convert audio file to different format.
    """
    from pydub import AudioSegment
    import io

    content = await file.read()

    try:
        audio = AudioSegment.from_file(io.BytesIO(content))

        # Apply conversions
        if sample_rate:
            audio = audio.set_frame_rate(sample_rate)

        if channels:
            audio = audio.set_channels(channels)

        # Export
        output = io.BytesIO()
        export_params = {}

        if bitrate and output_format in [OutputFormat.MP3, OutputFormat.OGG]:
            export_params["bitrate"] = bitrate

        audio.export(output, format=output_format.value, **export_params)
        output.seek(0)

        content_type = {
            OutputFormat.MP3: "audio/mpeg",
            OutputFormat.WAV: "audio/wav",
            OutputFormat.FLAC: "audio/flac",
            OutputFormat.OGG: "audio/ogg"
        }.get(output_format, "audio/mpeg")

        return StreamingResponse(
            output,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=converted.{output_format.value}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Conversion failed: {str(e)}")
