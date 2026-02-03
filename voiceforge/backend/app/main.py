"""
11labs - Production-Ready AI Voice Platform
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
from app.core.logging import setup_logging, RequestLogger, get_logger
from app.api.v1.router import api_router

# Setup logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initialize resources on startup, cleanup on shutdown.
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Device: {settings.DEVICE}")

    # Initialize Sentry for error tracking
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
        logger.info("Sentry initialized")

    # Initialize database
    try:
        from app.db import init_db
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    # Initialize Redis connection pool
    try:
        from app.core.rate_limiter import get_rate_limiter
        await get_rate_limiter()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")

    # Create storage directories
    if settings.STORAGE_TYPE == "local":
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        os.makedirs(f"{settings.STORAGE_PATH}/voices", exist_ok=True)
        os.makedirs(f"{settings.STORAGE_PATH}/generations", exist_ok=True)
        os.makedirs(f"{settings.STORAGE_PATH}/temp", exist_ok=True)
        logger.info(f"Storage initialized: {settings.STORAGE_PATH}")

    # Pre-load models in production
    if settings.ENVIRONMENT == "production" and not settings.DEBUG:
        logger.info("Pre-loading AI models...")
        try:
            from app.services.tts.tts_service import get_tts_service
            from app.services.stt.stt_service import get_stt_service

            tts = get_tts_service()
            await tts.initialize()
            logger.info("TTS model loaded")

            stt = get_stt_service()
            await stt.initialize()
            logger.info("STT model loaded")

        except Exception as e:
            logger.warning(f"Model pre-loading failed: {e}")

    logger.info("Application startup complete")

    yield

    # Cleanup on shutdown
    logger.info("Shutting down...")

    try:
        from app.db import close_db
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Database cleanup failed: {e}")

    try:
        from app.core.rate_limiter import _rate_limiter
        if _rate_limiter:
            await _rate_limiter.close()
        logger.info("Redis connections closed")
    except Exception as e:
        logger.error(f"Redis cleanup failed: {e}")

    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## 11labs API

A comprehensive AI voice platform providing:

- **Text-to-Speech**: Convert text to natural-sounding speech in 32+ languages
- **Voice Cloning**: Clone voices from just a few seconds of audio
- **Speech-to-Text**: Transcribe audio with 99% accuracy in 99+ languages
- **Sound Effects**: Generate any sound effect from text descriptions
- **Voice Isolation**: Separate vocals from background audio
- **Conversational AI**: Build voice-enabled AI agents

### Authentication

Use either:
- **Bearer Token**: JWT token from /auth/login
- **API Key**: Pass in `X-API-Key` header

### Rate Limits

| Plan | TTS/min | STT/min |
|------|---------|---------|
| Free | 10 | 5 |
| Starter | 30 | 15 |
| Creator | 60 | 30 |
| Pro | 120 | 60 |
| Scale | 300 | 150 |
| Enterprise | Custom | Custom |

### SDKs

- Python: `pip install elevenlabs`
- JavaScript: `npm install @elevenlabs/sdk`
    """,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG or settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.DEBUG or settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
    license_info={
        "name": "Proprietary",
        "url": "https://elevenlabs.io/terms",
    },
    contact={
        "name": "11labs Support",
        "email": "support@elevenlabs.io",
    },
)

# ==========================================
# Middleware
# ==========================================

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Request logging middleware
app.add_middleware(RequestLogger)

# Rate limiting middleware (production only)
if settings.RATE_LIMIT_ENABLED and settings.ENVIRONMENT != "test":
    from app.core.rate_limiter import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    response.headers["X-Request-ID"] = getattr(request.state, "request_id", "unknown")
    return response


# ==========================================
# Exception Handlers
# ==========================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with Sentry integration"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # Report to Sentry in production
    if settings.SENTRY_DSN:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_server_error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "type": type(exc).__name__ if settings.DEBUG else None
        }
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "detail": "The requested resource was not found"
        }
    )


# ==========================================
# Routes
# ==========================================

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Include health endpoints at root level
from app.api.v1.endpoints.health import router as health_router
app.include_router(health_router, tags=["Health"])


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
        "health": "/health"
    }


# ==========================================
# Static Files
# ==========================================

# Serve static files for local storage
if settings.STORAGE_TYPE == "local" and os.path.exists(settings.STORAGE_PATH):
    app.mount(
        "/storage",
        StaticFiles(directory=settings.STORAGE_PATH),
        name="storage"
    )


# ==========================================
# Entry Point
# ==========================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=settings.DEBUG
    )
