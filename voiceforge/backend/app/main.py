"""
VoiceForge - ElevenLabs Clone
Main FastAPI Application
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import time
import os

from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initialize resources on startup, cleanup on shutdown.
    """
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"Device: {settings.DEVICE}")

    # Create storage directories
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(f"{settings.STORAGE_PATH}/voices", exist_ok=True)
    os.makedirs(f"{settings.STORAGE_PATH}/generations", exist_ok=True)
    os.makedirs(f"{settings.STORAGE_PATH}/temp", exist_ok=True)

    # Pre-load models if not in debug mode (optional)
    if not settings.DEBUG:
        print("Pre-loading AI models...")
        # Models are lazy-loaded on first request for faster startup

    yield

    # Cleanup on shutdown
    print("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
    ## VoiceForge API

    A comprehensive AI voice platform providing:

    - **Text-to-Speech**: Convert text to natural-sounding speech
    - **Voice Cloning**: Clone voices from audio samples
    - **Speech-to-Text**: Transcribe audio with speaker diarization
    - **Sound Effects**: Generate sound effects from text descriptions
    - **Voice Isolation**: Separate vocals from background audio
    - **Audio Enhancement**: Clean up noisy recordings

    ### Authentication

    Use either:
    - **Bearer Token**: JWT token from /auth/login
    - **API Key**: Pass in X-API-Key header

    ### Rate Limits

    - Free tier: 10 requests/minute
    - Paid plans: Higher limits based on plan
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": str(exc) if settings.DEBUG else "Internal server error",
            "type": type(exc).__name__
        }
    )


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX
    }


# Serve static files (for audio previews, etc.)
if os.path.exists(settings.STORAGE_PATH):
    app.mount(
        "/static",
        StaticFiles(directory=settings.STORAGE_PATH),
        name="static"
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS
    )
