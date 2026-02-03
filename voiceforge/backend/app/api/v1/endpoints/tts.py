"""
Text-to-Speech API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional
import io

from app.schemas.audio import (
    TTSRequest, TTSResponse, TTSStreamRequest,
    VoiceSettings, OutputFormat
)
from app.services.tts.tts_service import get_tts_service
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/text-to-speech/{voice_id}", response_model=TTSResponse)
async def text_to_speech(
    voice_id: str,
    request: TTSRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Convert text to speech using the specified voice.

    - **voice_id**: ID of the voice to use
    - **text**: Text to convert (max 40,000 characters)
    - **model_id**: TTS model to use (default: eleven_multilingual_v2)
    - **voice_settings**: Optional voice configuration
    - **output_format**: Output format (mp3, wav, pcm, ogg, flac)
    """
    tts_service = get_tts_service()

    # Validate text length
    if len(request.text) > 40000:
        raise HTTPException(
            status_code=400,
            detail="Text exceeds maximum length of 40,000 characters"
        )

    try:
        audio_bytes, duration, sample_rate = await tts_service.generate_speech(
            text=request.text,
            voice_id=voice_id,
            voice_settings=request.voice_settings,
            output_format=request.output_format,
            sample_rate=request.sample_rate,
            language=request.language_code
        )

        # TODO: Store audio and return URL
        # For now, return base64 or direct response

        return TTSResponse(
            audio_url=f"/api/v1/audio/generations/{voice_id}/latest",  # Placeholder
            duration_seconds=duration,
            characters_used=len(request.text),
            model_id=request.model_id,
            voice_id=voice_id,
            format=request.output_format.value,
            sample_rate=sample_rate
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text-to-speech/{voice_id}/stream")
async def text_to_speech_stream(
    voice_id: str,
    request: TTSStreamRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream text-to-speech audio generation.
    Returns audio chunks as they're generated for real-time playback.
    """
    tts_service = get_tts_service()

    async def audio_generator():
        async for chunk in tts_service.generate_speech_stream(
            text=request.text,
            voice_id=voice_id,
            voice_settings=request.voice_settings,
            output_format=request.output_format
        ):
            yield chunk

    content_type = {
        OutputFormat.MP3: "audio/mpeg",
        OutputFormat.WAV: "audio/wav",
        OutputFormat.PCM: "audio/pcm",
        OutputFormat.OGG: "audio/ogg",
        OutputFormat.FLAC: "audio/flac"
    }.get(request.output_format, "audio/mpeg")

    return StreamingResponse(
        audio_generator(),
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename=speech.{request.output_format.value}",
            "Transfer-Encoding": "chunked"
        }
    )


@router.post("/text-to-speech/{voice_id}/with-timestamps")
async def text_to_speech_with_timestamps(
    voice_id: str,
    request: TTSRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate speech with word-level timestamps for lip-sync or karaoke applications.
    """
    # TODO: Implement timestamp generation
    # This would require modifications to the TTS service to track word timings

    raise HTTPException(
        status_code=501,
        detail="Timestamp generation not yet implemented"
    )


@router.get("/models")
async def list_models():
    """
    List available TTS models.
    """
    return {
        "models": [
            {
                "model_id": "eleven_multilingual_v2",
                "name": "Multilingual v2",
                "description": "Highest quality, emotionally-aware speech synthesis",
                "languages": 29,
                "max_characters": 10000,
                "latency": "high"
            },
            {
                "model_id": "eleven_flash_v2_5",
                "name": "Flash v2.5",
                "description": "Ultra-low latency model for real-time applications",
                "languages": 32,
                "max_characters": 40000,
                "latency": "~75ms"
            },
            {
                "model_id": "eleven_turbo_v2_5",
                "name": "Turbo v2.5",
                "description": "Balanced speed and quality",
                "languages": 32,
                "max_characters": 40000,
                "latency": "medium"
            }
        ]
    }


@router.get("/voices")
async def list_voices(
    show_legacy: bool = Query(False, description="Include legacy voices"),
    current_user: dict = Depends(get_current_user)
):
    """
    List available voices including premade and user-cloned voices.
    """
    tts_service = get_tts_service()

    # Get system voices
    system_voices = tts_service.get_available_voices()

    # TODO: Get user's cloned voices from database

    voices = []
    for voice_name in system_voices:
        voices.append({
            "voice_id": voice_name.lower().replace(" ", "_"),
            "name": voice_name,
            "category": "premade",
            "description": f"Premade voice: {voice_name}",
            "labels": {},
            "preview_url": None
        })

    return {"voices": voices, "total": len(voices)}


@router.get("/languages")
async def list_languages():
    """
    List supported languages for TTS.
    """
    tts_service = get_tts_service()
    languages = tts_service.get_available_languages()

    language_names = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
        "pl": "Polish",
        "tr": "Turkish",
        "ru": "Russian",
        "nl": "Dutch",
        "cs": "Czech",
        "ar": "Arabic",
        "zh-cn": "Chinese (Simplified)",
        "ja": "Japanese",
        "hu": "Hungarian",
        "ko": "Korean",
        "hi": "Hindi"
    }

    return {
        "languages": [
            {"code": lang, "name": language_names.get(lang, lang)}
            for lang in languages
        ]
    }
