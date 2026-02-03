"""
Sound Effects Generation API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import io

from app.schemas.audio import SoundEffectRequest, SoundEffectResponse, OutputFormat
from app.services.sound_effects.sfx_service import get_sfx_service
from app.core.security import get_current_user

router = APIRouter()


@router.post("/sound-generation", response_model=SoundEffectResponse)
async def generate_sound_effect(
    request: SoundEffectRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a sound effect from a text description.

    - **prompt**: Description of the sound effect (e.g., "rain on a window")
    - **duration_seconds**: Duration of generated audio (0.5 - 30 seconds)
    - **prompt_influence**: How closely to follow the prompt (0-1)
    - **output_format**: Output format (mp3, wav, flac, ogg)
    """
    sfx_service = get_sfx_service()

    try:
        audio_bytes, duration = await sfx_service.generate(
            prompt=request.prompt,
            duration_seconds=request.duration_seconds,
            guidance_scale=3.5 + (request.prompt_influence * 4),  # Map 0-1 to 3.5-7.5
            output_format=request.output_format
        )

        # TODO: Store audio and return URL
        # For now, return info about generation

        return SoundEffectResponse(
            audio_url=f"/api/v1/audio/sfx/latest",  # Placeholder
            duration_seconds=duration,
            prompt=request.prompt
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sound-generation/stream")
async def generate_sound_effect_stream(
    prompt: str = Form(..., description="Sound effect description"),
    duration_seconds: float = Form(5.0, ge=0.5, le=30.0),
    output_format: OutputFormat = Form(OutputFormat.MP3),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate and stream a sound effect directly.
    Returns the audio file directly in the response.
    """
    sfx_service = get_sfx_service()

    try:
        audio_bytes, duration = await sfx_service.generate(
            prompt=prompt,
            duration_seconds=duration_seconds,
            output_format=output_format
        )

        content_type = {
            OutputFormat.MP3: "audio/mpeg",
            OutputFormat.WAV: "audio/wav",
            OutputFormat.PCM: "audio/pcm",
            OutputFormat.OGG: "audio/ogg",
            OutputFormat.FLAC: "audio/flac"
        }.get(output_format, "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=sfx.{output_format.value}",
                "X-Duration-Seconds": str(duration)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sound-generation/loop")
async def generate_looping_sound_effect(
    prompt: str = Form(..., description="Sound effect description"),
    duration_seconds: float = Form(5.0, ge=0.5, le=30.0),
    output_format: OutputFormat = Form(OutputFormat.MP3),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a seamlessly looping sound effect.
    Ideal for ambient sounds, background music, game audio loops.
    """
    sfx_service = get_sfx_service()

    try:
        audio_bytes, duration = await sfx_service.generate_looping(
            prompt=prompt,
            duration_seconds=duration_seconds,
            output_format=output_format
        )

        content_type = {
            OutputFormat.MP3: "audio/mpeg",
            OutputFormat.WAV: "audio/wav",
        }.get(output_format, "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=sfx_loop.{output_format.value}",
                "X-Duration-Seconds": str(duration),
                "X-Loopable": "true"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sound-generation/suggestions")
async def get_sfx_suggestions():
    """
    Get suggested prompts for sound effect generation.
    """
    sfx_service = get_sfx_service()

    return {
        "suggestions": sfx_service.get_suggested_prompts(),
        "categories": [
            {
                "name": "Nature",
                "examples": [
                    "rain falling on a window",
                    "thunder in the distance",
                    "birds chirping in a forest"
                ]
            },
            {
                "name": "Urban",
                "examples": [
                    "city traffic with car horns",
                    "footsteps on a wooden floor",
                    "door creaking open"
                ]
            },
            {
                "name": "Action",
                "examples": [
                    "explosion in the distance",
                    "sword clashing",
                    "glass breaking"
                ]
            },
            {
                "name": "Ambient",
                "examples": [
                    "coffee shop ambiance",
                    "office background noise",
                    "spaceship interior hum"
                ]
            },
            {
                "name": "Electronic",
                "examples": [
                    "sci-fi computer beep",
                    "futuristic whoosh",
                    "notification chime"
                ]
            }
        ]
    }


@router.get("/sound-generation/history")
async def get_sfx_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's sound effect generation history.
    """
    # TODO: Implement history retrieval from database

    return {
        "items": [],
        "total": 0,
        "limit": limit,
        "offset": offset
    }
