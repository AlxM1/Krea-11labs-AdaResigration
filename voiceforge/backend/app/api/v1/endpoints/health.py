"""
Health check and metrics endpoints
"""
from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse
from typing import Dict, Any
import asyncio
from datetime import datetime

from app.core.config import settings
from app.core.metrics import get_metrics, get_metrics_content_type, update_gpu_metrics

router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    Returns service status.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check - verifies all dependencies are available.
    Used by Kubernetes readiness probes.
    """
    checks = {}
    all_healthy = True

    # Check database
    try:
        from app.db import engine
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    # Check Redis
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.close()
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    # Check storage
    try:
        from app.services.storage import get_storage_service
        storage = get_storage_service()
        # Simple check - just verify service is initialized
        checks["storage"] = {"status": "healthy", "type": settings.STORAGE_TYPE}
    except Exception as e:
        checks["storage"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    status_code = 200 if all_healthy else 503

    return Response(
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        },
        status_code=status_code
    )


@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check - verifies the service is running.
    Used by Kubernetes liveness probes.
    """
    return {"status": "alive"}


@router.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics():
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    """
    # Update GPU metrics if available
    update_gpu_metrics()

    return Response(
        content=get_metrics(),
        media_type=get_metrics_content_type()
    )


@router.get("/health/models")
async def models_health() -> Dict[str, Any]:
    """
    Check health of AI models.
    """
    models_status = {}

    # Check TTS model
    try:
        from app.services.tts.tts_service import get_tts_service
        tts = get_tts_service()
        models_status["tts"] = {
            "loaded": tts._initialized if hasattr(tts, '_initialized') else False,
            "model": settings.TTS_MODEL
        }
    except Exception as e:
        models_status["tts"] = {"loaded": False, "error": str(e)}

    # Check STT model
    try:
        from app.services.stt.stt_service import get_stt_service
        stt = get_stt_service()
        models_status["stt"] = {
            "loaded": stt._initialized if hasattr(stt, '_initialized') else False,
            "model": settings.WHISPER_MODEL
        }
    except Exception as e:
        models_status["stt"] = {"loaded": False, "error": str(e)}

    # Check GPU availability
    try:
        import torch
        models_status["gpu"] = {
            "available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
        }
    except Exception as e:
        models_status["gpu"] = {"available": False, "error": str(e)}

    return {
        "models": models_status,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
