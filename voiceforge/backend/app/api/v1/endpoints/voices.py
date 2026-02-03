"""
Voice Management API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List
import json

from app.schemas.audio import (
    VoiceCloneRequest, VoiceCloneResponse, Voice, VoiceListResponse
)
from app.services.voice_cloning.clone_service import get_clone_service
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/add", response_model=VoiceCloneResponse)
async def create_voice_clone(
    name: str = Form(..., description="Name for the voice"),
    description: Optional[str] = Form(None, description="Voice description"),
    labels: Optional[str] = Form(None, description="JSON string of labels"),
    files: List[UploadFile] = File(..., description="Audio file(s) for cloning"),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new voice clone from audio sample(s).

    - For **instant cloning**: Upload 1-2 minutes of clear audio
    - For **professional cloning**: Upload 30+ minutes of audio (Creator+ plan required)

    Supported formats: MP3, WAV, FLAC, OGG, M4A
    """
    clone_service = get_clone_service()

    # Parse labels if provided
    voice_labels = {}
    if labels:
        try:
            voice_labels = json.loads(labels)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid labels JSON")

    # Validate files
    if not files:
        raise HTTPException(status_code=400, detail="At least one audio file is required")

    # Check file formats
    allowed_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.m4a'}
    for file in files:
        ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {ext}. Allowed: {', '.join(allowed_extensions)}"
            )

    try:
        # Read audio data
        audio_data_list = []
        for file in files:
            content = await file.read()
            audio_data_list.append(content)

        # Calculate total size
        total_size = sum(len(data) for data in audio_data_list)
        max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024

        if total_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Total file size exceeds {settings.MAX_FILE_SIZE_MB}MB limit"
            )

        # Determine clone type based on audio length
        # For simplicity, use first file for instant clone
        # Multiple files would trigger professional clone workflow

        if len(audio_data_list) == 1:
            # Instant clone
            result = await clone_service.create_instant_clone(
                audio_data=audio_data_list[0],
                name=name,
                user_id=current_user["user_id"],
                description=description,
                labels=voice_labels
            )
        else:
            # Professional clone (requires more audio)
            result = await clone_service.create_professional_clone(
                audio_files=audio_data_list,
                name=name,
                user_id=current_user["user_id"],
                description=description,
                labels=voice_labels
            )

        return VoiceCloneResponse(
            voice_id=result["voice_id"],
            name=result["name"],
            description=result.get("description"),
            preview_url=result.get("preview_path"),
            created_at=result.get("created_at", "2024-01-01T00:00:00Z"),
            labels=result.get("labels", {}),
            clone_type=result.get("clone_type", "instant")
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=VoiceListResponse)
async def list_voices(
    current_user: dict = Depends(get_current_user)
):
    """
    List all voices available to the user (cloned + premade).
    """
    clone_service = get_clone_service()

    # Get user's cloned voices
    cloned_voices = await clone_service.list_voices(current_user["user_id"])

    voices = []
    for v in cloned_voices:
        voices.append(Voice(
            voice_id=v["voice_id"],
            name=v["name"],
            description=v.get("description"),
            preview_url=v.get("preview_path"),
            category=v.get("category", "cloned"),
            labels=v.get("labels", {}),
            language=v.get("language"),
            is_public=False
        ))

    # TODO: Add premade system voices

    return VoiceListResponse(voices=voices, total=len(voices))


@router.get("/{voice_id}", response_model=Voice)
async def get_voice(
    voice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get details of a specific voice.
    """
    clone_service = get_clone_service()

    voice = await clone_service.get_voice(voice_id)

    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Check access permission
    if voice.get("user_id") != current_user["user_id"] and not voice.get("is_public"):
        raise HTTPException(status_code=403, detail="Access denied")

    return Voice(
        voice_id=voice["voice_id"],
        name=voice["name"],
        description=voice.get("description"),
        preview_url=voice.get("preview_path"),
        category=voice.get("category", "cloned"),
        labels=voice.get("labels", {}),
        language=voice.get("language"),
        is_public=voice.get("is_public", False)
    )


@router.delete("/{voice_id}")
async def delete_voice(
    voice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a cloned voice.
    """
    clone_service = get_clone_service()

    try:
        success = await clone_service.delete_voice(voice_id, current_user["user_id"])

        if not success:
            raise HTTPException(status_code=404, detail="Voice not found")

        return {"status": "ok", "message": "Voice deleted successfully"}

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{voice_id}/edit")
async def edit_voice(
    voice_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    labels: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Edit voice metadata.
    """
    clone_service = get_clone_service()

    voice = await clone_service.get_voice(voice_id)

    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    if voice.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update metadata
    # TODO: Implement update in clone_service

    return {"status": "ok", "message": "Voice updated"}


@router.get("/{voice_id}/settings")
async def get_voice_settings(
    voice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get default settings for a voice.
    """
    clone_service = get_clone_service()

    voice = await clone_service.get_voice(voice_id)

    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    return {
        "voice_id": voice_id,
        "settings": voice.get("default_settings", {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 1.0
        })
    }
