"""
Voice Library API endpoints
Browse and use free voices from multiple sources
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
import io

from app.services.voice_library import get_voice_library_service
from app.core.security import get_current_user, get_optional_user

router = APIRouter()


# ==========================================
# Response Models
# ==========================================

class VoiceSourceInfo(BaseModel):
    id: str
    name: str
    description: str
    license: str
    speakers: int
    languages: List[str]


class LibraryVoiceResponse(BaseModel):
    id: str
    source: str
    source_id: str
    name: str
    description: Optional[str] = None
    gender: Optional[str] = None
    accent: Optional[str] = None
    language: str = "en"
    languages: Optional[List[str]] = None
    quality: str = "standard"
    style: Optional[str] = None
    license: Optional[str] = None
    is_downloaded: bool = False
    sample_audio_path: Optional[str] = None


class VoiceLibraryListResponse(BaseModel):
    voices: List[LibraryVoiceResponse]
    total: int
    limit: int
    offset: int
    sources: List[str]


class LibraryStatsResponse(BaseModel):
    total_voices: int
    by_source: dict
    by_gender: dict
    by_language: dict
    by_quality: dict


class AddToCollectionRequest(BaseModel):
    voice_id: str
    custom_name: Optional[str] = None


# ==========================================
# Endpoints
# ==========================================

@router.get("/sources", response_model=List[VoiceSourceInfo])
async def list_voice_sources():
    """
    List all available voice sources (datasets).

    Returns information about each source including:
    - Name and description
    - License information
    - Number of speakers available
    - Supported languages
    """
    service = get_voice_library_service()
    return service.get_all_sources()


@router.get("/voices", response_model=VoiceLibraryListResponse)
async def list_library_voices(
    source: Optional[str] = Query(None, description="Filter by source (xtts_builtin, vctk, bark, etc.)"),
    language: Optional[str] = Query(None, description="Filter by language code (en, de, fr, etc.)"),
    gender: Optional[str] = Query(None, description="Filter by gender (male, female)"),
    search: Optional[str] = Query(None, description="Search by name, description, or accent"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of voices to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    List voices from the library with optional filtering.

    Available sources:
    - **xtts_builtin**: 59 built-in XTTS v2 speakers (always available)
    - **bark**: 40 Bark voice presets (multilingual)
    - **vctk**: 110 English speakers with various accents
    - **hifi_tts**: 10 studio quality voices
    - **lj_speech**: 1 high-quality female voice
    - **libri_tts**: 2,400+ English speakers
    - **common_voice**: Multilingual crowdsourced voices
    - **speecht5**: 7,930 speaker embeddings
    """
    service = get_voice_library_service()
    result = await service.get_voices(
        source=source,
        language=language,
        gender=gender,
        search=search,
        limit=limit,
        offset=offset,
    )
    return result


@router.get("/voices/{voice_id}", response_model=LibraryVoiceResponse)
async def get_library_voice(voice_id: str):
    """
    Get details of a specific library voice.
    """
    service = get_voice_library_service()
    voice = await service.get_voice(voice_id)

    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    return voice


@router.post("/voices/{voice_id}/download")
async def download_voice_data(
    voice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download/cache a voice's sample audio and embedding.

    This prepares the voice for use with TTS by downloading
    reference audio from the source dataset.
    """
    service = get_voice_library_service()

    try:
        voice = await service.download_voice(voice_id)
        return {
            "status": "ok",
            "voice_id": voice_id,
            "is_downloaded": voice.get("is_downloaded", False),
            "sample_audio_path": voice.get("sample_audio_path"),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices/{voice_id}/preview")
async def preview_voice(
    voice_id: str,
    text: str = Query(
        "Hello, this is a preview of my voice. I hope you find it useful for your projects.",
        description="Text to synthesize for the preview",
        max_length=500
    ),
):
    """
    Generate a preview audio for a voice.

    Returns the generated audio as a WAV file stream.
    Built-in voices (XTTS, Bark) work immediately.
    Dataset voices require downloading first.
    """
    service = get_voice_library_service()

    try:
        audio_bytes = await service.generate_preview(voice_id, text)

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename=preview_{voice_id}.wav"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


@router.post("/voices/{voice_id}/add-to-collection")
async def add_voice_to_collection(
    voice_id: str,
    request: AddToCollectionRequest = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a library voice to your personal voice collection.

    This allows you to use the voice with TTS generation
    and optionally give it a custom name.
    """
    service = get_voice_library_service()

    custom_name = request.custom_name if request else None

    try:
        result = await service.add_to_user_collection(
            user_id=current_user["user_id"],
            voice_id=voice_id,
            custom_name=custom_name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=LibraryStatsResponse)
async def get_library_statistics():
    """
    Get statistics about the voice library.

    Returns counts of voices by source, gender, language, and quality.
    """
    service = get_voice_library_service()
    stats = await service.get_statistics()
    return stats


@router.get("/languages")
async def list_supported_languages():
    """
    List all languages supported across voice sources.
    """
    return {
        "languages": [
            {"code": "en", "name": "English", "sources": ["xtts_builtin", "bark", "vctk", "hifi_tts", "lj_speech", "libri_tts", "common_voice", "speecht5"]},
            {"code": "de", "name": "German", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "fr", "name": "French", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "es", "name": "Spanish", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "it", "name": "Italian", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "pt", "name": "Portuguese", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "pl", "name": "Polish", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "tr", "name": "Turkish", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "ru", "name": "Russian", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "nl", "name": "Dutch", "sources": ["xtts_builtin", "common_voice"]},
            {"code": "cs", "name": "Czech", "sources": ["xtts_builtin"]},
            {"code": "ar", "name": "Arabic", "sources": ["xtts_builtin", "common_voice"]},
            {"code": "zh", "name": "Chinese", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "ja", "name": "Japanese", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "hu", "name": "Hungarian", "sources": ["xtts_builtin"]},
            {"code": "ko", "name": "Korean", "sources": ["xtts_builtin", "bark", "common_voice"]},
            {"code": "hi", "name": "Hindi", "sources": ["bark", "common_voice"]},
        ]
    }


@router.get("/featured")
async def get_featured_voices():
    """
    Get a curated list of featured/recommended voices.
    """
    service = get_voice_library_service()

    # Get a selection of high-quality voices from each source
    featured = []

    # XTTS featured voices
    xtts_featured = ["xtts_nova_hogarth", "xtts_andrew_chipper", "xtts_damien_black", "xtts_gracie_wise"]

    # Bark featured voices
    bark_featured = ["bark_v2_en_speaker_6", "bark_v2_en_speaker_0", "bark_v2_de_speaker_2", "bark_v2_ja_speaker_1"]

    # VCTK featured voices (diverse accents)
    vctk_featured = ["vctk_p225", "vctk_p226", "vctk_p234", "vctk_p245", "vctk_p293"]

    # HiFi featured
    hifi_featured = ["hifi_92", "hifi_6670"]

    # LJSpeech
    lj_featured = ["ljspeech_linda"]

    all_featured_ids = xtts_featured + bark_featured + vctk_featured + hifi_featured + lj_featured

    for voice_id in all_featured_ids:
        voice = await service.get_voice(voice_id)
        if voice:
            featured.append(voice)

    return {
        "featured": featured,
        "categories": [
            {
                "name": "Ready to Use",
                "description": "Built-in voices that work immediately",
                "voice_ids": xtts_featured + bark_featured
            },
            {
                "name": "British & Irish Accents",
                "description": "Authentic UK accent voices",
                "voice_ids": ["vctk_p225", "vctk_p234", "vctk_p245", "vctk_p266"]
            },
            {
                "name": "American Voices",
                "description": "Natural American English speakers",
                "voice_ids": ["vctk_p293", "vctk_p294", "vctk_p299", "xtts_gracie_wise"]
            },
            {
                "name": "Studio Quality",
                "description": "Professional recording quality",
                "voice_ids": hifi_featured + lj_featured
            },
            {
                "name": "Multilingual",
                "description": "Non-English language voices",
                "voice_ids": ["bark_v2_de_speaker_2", "bark_v2_ja_speaker_1", "bark_v2_zh_speaker_1", "bark_v2_ko_speaker_1"]
            }
        ]
    }
