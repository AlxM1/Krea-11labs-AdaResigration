"""
API v1 Router - combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import tts, voices, stt, sound_effects, audio_tools, auth

api_router = APIRouter()

# Authentication routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# Text-to-Speech routes
api_router.include_router(
    tts.router,
    prefix="",
    tags=["Text-to-Speech"]
)

# Voice management routes
api_router.include_router(
    voices.router,
    prefix="/voices",
    tags=["Voices"]
)

# Speech-to-Text routes
api_router.include_router(
    stt.router,
    prefix="",
    tags=["Speech-to-Text"]
)

# Sound Effects routes
api_router.include_router(
    sound_effects.router,
    prefix="",
    tags=["Sound Effects"]
)

# Audio Tools routes (isolation, enhancement, etc.)
api_router.include_router(
    audio_tools.router,
    prefix="",
    tags=["Audio Tools"]
)
