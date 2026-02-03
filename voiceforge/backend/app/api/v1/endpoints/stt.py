"""
Speech-to-Text API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import json

from app.schemas.audio import STTRequest, STTResponse, TranscriptionSegment
from app.services.stt.stt_service import get_stt_service
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/speech-to-text", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="Language code or 'auto'"),
    model: str = Form("scribe_v2", description="STT model to use"),
    diarize: bool = Form(False, description="Enable speaker diarization"),
    timestamps: str = Form("segment", description="Timestamp granularity: 'word' or 'segment'"),
    tag_audio_events: bool = Form(False, description="Tag audio events"),
    detect_entities: bool = Form(False, description="Detect PII/PHI entities"),
    current_user: dict = Depends(get_current_user)
):
    """
    Transcribe audio to text.

    - **file**: Audio file (MP3, WAV, FLAC, OGG, M4A)
    - **language**: Language code (e.g., 'en', 'es') or 'auto' for detection
    - **model**: STT model (scribe_v2, scribe_v2_realtime)
    - **diarize**: Enable speaker diarization (identifies different speakers)
    - **timestamps**: 'word' for word-level, 'segment' for sentence-level
    - **tag_audio_events**: Tag events like [laughter], [applause]
    - **detect_entities**: Detect and flag PII, PHI, PCI data
    """
    stt_service = get_stt_service()

    # Validate file format
    allowed_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.m4a', '.webm'}
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
        result = await stt_service.transcribe(
            audio_data=content,
            language=language if language != "auto" else None,
            diarize=diarize,
            timestamps=timestamps,
            tag_audio_events=tag_audio_events,
            detect_entities=detect_entities
        )

        segments = [
            TranscriptionSegment(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"],
                speaker=seg.get("speaker"),
                confidence=seg.get("confidence")
            )
            for seg in result.get("segments", [])
        ]

        return STTResponse(
            text=result["text"],
            language=result["language"],
            duration_seconds=result["duration_seconds"],
            segments=segments,
            speakers=result.get("speakers"),
            words=result.get("words")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speech-to-text/url")
async def speech_to_text_from_url(
    url: str = Form(..., description="URL of audio file"),
    language: Optional[str] = Form(None),
    model: str = Form("scribe_v2"),
    diarize: bool = Form(False),
    timestamps: str = Form("segment"),
    current_user: dict = Depends(get_current_user)
):
    """
    Transcribe audio from URL.
    """
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=60.0)
            response.raise_for_status()
            content = response.content

    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch audio: {str(e)}")

    stt_service = get_stt_service()

    try:
        result = await stt_service.transcribe(
            audio_data=content,
            language=language if language != "auto" else None,
            diarize=diarize,
            timestamps=timestamps
        )

        return STTResponse(
            text=result["text"],
            language=result["language"],
            duration_seconds=result["duration_seconds"],
            segments=[
                TranscriptionSegment(**seg)
                for seg in result.get("segments", [])
            ],
            speakers=result.get("speakers"),
            words=result.get("words")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/speech-to-text/realtime")
async def realtime_transcription(websocket):
    """
    Real-time speech-to-text via WebSocket.

    Send audio chunks, receive transcription results.
    """
    await websocket.accept()

    stt_service = get_stt_service()

    try:
        while True:
            # Receive audio chunk
            data = await websocket.receive_bytes()

            # Transcribe chunk
            result = await stt_service.transcribe_realtime(data)

            # Send result
            await websocket.send_json({
                "text": result["text"],
                "language": result["language"],
                "is_final": result.get("is_final", False)
            })

    except Exception as e:
        await websocket.close(code=1000, reason=str(e))


@router.get("/speech-to-text/languages")
async def list_stt_languages():
    """
    List supported languages for speech-to-text.
    """
    # Whisper supports 99+ languages
    languages = [
        {"code": "en", "name": "English"},
        {"code": "es", "name": "Spanish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "it", "name": "Italian"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "ru", "name": "Russian"},
        {"code": "ja", "name": "Japanese"},
        {"code": "ko", "name": "Korean"},
        {"code": "zh", "name": "Chinese"},
        {"code": "ar", "name": "Arabic"},
        {"code": "hi", "name": "Hindi"},
        {"code": "nl", "name": "Dutch"},
        {"code": "pl", "name": "Polish"},
        {"code": "tr", "name": "Turkish"},
        {"code": "vi", "name": "Vietnamese"},
        {"code": "th", "name": "Thai"},
        {"code": "id", "name": "Indonesian"},
        {"code": "ms", "name": "Malay"},
        {"code": "tl", "name": "Filipino/Tagalog"},
        # ... many more supported
    ]

    return {
        "languages": languages,
        "total": 99,
        "note": "Whisper supports 99+ languages. Auto-detection available."
    }


@router.post("/speech-to-text/export/{format}")
async def export_transcription(
    format: str,
    transcription: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Export transcription to various formats.

    Supported formats: txt, srt, vtt, json, pdf, docx
    """
    text = transcription.get("text", "")
    segments = transcription.get("segments", [])

    if format == "txt":
        content = text
        media_type = "text/plain"
        filename = "transcription.txt"

    elif format == "srt":
        # Generate SRT subtitle format
        srt_lines = []
        for i, seg in enumerate(segments, 1):
            start = _format_timestamp_srt(seg["start"])
            end = _format_timestamp_srt(seg["end"])
            srt_lines.append(f"{i}")
            srt_lines.append(f"{start} --> {end}")
            srt_lines.append(seg["text"])
            srt_lines.append("")
        content = "\n".join(srt_lines)
        media_type = "text/plain"
        filename = "transcription.srt"

    elif format == "vtt":
        # Generate WebVTT format
        vtt_lines = ["WEBVTT", ""]
        for seg in segments:
            start = _format_timestamp_vtt(seg["start"])
            end = _format_timestamp_vtt(seg["end"])
            vtt_lines.append(f"{start} --> {end}")
            vtt_lines.append(seg["text"])
            vtt_lines.append("")
        content = "\n".join(vtt_lines)
        media_type = "text/vtt"
        filename = "transcription.vtt"

    elif format == "json":
        content = json.dumps(transcription, indent=2)
        media_type = "application/json"
        filename = "transcription.json"

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    return StreamingResponse(
        iter([content.encode()]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def _format_timestamp_srt(seconds: float) -> str:
    """Format timestamp for SRT: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _format_timestamp_vtt(seconds: float) -> str:
    """Format timestamp for VTT: HH:MM:SS.mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
