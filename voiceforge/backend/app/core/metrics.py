"""
Prometheus Metrics and Monitoring
"""
from prometheus_client import (
    Counter, Histogram, Gauge, Info,
    generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry, multiprocess, REGISTRY
)
from functools import wraps
import time
import os

from app.core.config import settings


# Custom registry for multiprocess mode
if "prometheus_multiproc_dir" in os.environ:
    registry = CollectorRegistry()
    multiprocess.MultiProcessCollector(registry)
else:
    registry = REGISTRY


# ============= Request Metrics =============

# HTTP request counter
http_requests_total = Counter(
    "elevenlabs_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
    registry=registry
)

# HTTP request latency
http_request_duration_seconds = Histogram(
    "elevenlabs_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0],
    registry=registry
)


# ============= AI Model Metrics =============

# TTS generation counter
tts_generations_total = Counter(
    "elevenlabs_tts_generations_total",
    "Total TTS generations",
    ["model", "voice_type", "status"],
    registry=registry
)

# TTS generation latency
tts_generation_duration_seconds = Histogram(
    "elevenlabs_tts_generation_duration_seconds",
    "TTS generation latency in seconds",
    ["model"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
    registry=registry
)

# TTS characters processed
tts_characters_total = Counter(
    "elevenlabs_tts_characters_total",
    "Total characters processed by TTS",
    ["model"],
    registry=registry
)

# STT transcription counter
stt_transcriptions_total = Counter(
    "elevenlabs_stt_transcriptions_total",
    "Total STT transcriptions",
    ["model", "language", "status"],
    registry=registry
)

# STT transcription latency
stt_transcription_duration_seconds = Histogram(
    "elevenlabs_stt_transcription_duration_seconds",
    "STT transcription latency in seconds",
    ["model"],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
    registry=registry
)

# Audio duration processed
stt_audio_duration_seconds = Counter(
    "elevenlabs_stt_audio_duration_seconds_total",
    "Total audio duration processed by STT",
    ["model"],
    registry=registry
)

# Voice cloning counter
voice_clones_total = Counter(
    "elevenlabs_voice_clones_total",
    "Total voice clones created",
    ["type", "status"],
    registry=registry
)

# Sound effects generation counter
sfx_generations_total = Counter(
    "elevenlabs_sfx_generations_total",
    "Total sound effects generated",
    ["status"],
    registry=registry
)


# ============= System Metrics =============

# Active model instances
active_models = Gauge(
    "elevenlabs_active_models",
    "Number of active AI model instances",
    ["model_type"],
    registry=registry
)

# GPU memory usage (if available)
gpu_memory_usage_bytes = Gauge(
    "elevenlabs_gpu_memory_usage_bytes",
    "GPU memory usage in bytes",
    ["device"],
    registry=registry
)

# Queue depth
task_queue_depth = Gauge(
    "elevenlabs_task_queue_depth",
    "Number of tasks in queue",
    ["queue"],
    registry=registry
)

# Active connections
active_connections = Gauge(
    "elevenlabs_active_connections",
    "Number of active connections",
    ["type"],
    registry=registry
)


# ============= Business Metrics =============

# Credits used
credits_used_total = Counter(
    "elevenlabs_credits_used_total",
    "Total credits used",
    ["user_plan", "feature"],
    registry=registry
)

# Active users
active_users = Gauge(
    "elevenlabs_active_users",
    "Number of active users",
    ["plan"],
    registry=registry
)

# API key usage
api_key_requests_total = Counter(
    "elevenlabs_api_key_requests_total",
    "Total API key requests",
    ["key_id"],
    registry=registry
)


# ============= Helper Functions =============

def track_request(method: str, endpoint: str, status: int, duration: float):
    """Track HTTP request metrics"""
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status=str(status)
    ).inc()

    http_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)


def track_tts_generation(
    model: str,
    voice_type: str,
    characters: int,
    duration: float,
    success: bool
):
    """Track TTS generation metrics"""
    status = "success" if success else "error"

    tts_generations_total.labels(
        model=model,
        voice_type=voice_type,
        status=status
    ).inc()

    if success:
        tts_generation_duration_seconds.labels(model=model).observe(duration)
        tts_characters_total.labels(model=model).inc(characters)


def track_stt_transcription(
    model: str,
    language: str,
    audio_duration: float,
    processing_duration: float,
    success: bool
):
    """Track STT transcription metrics"""
    status = "success" if success else "error"

    stt_transcriptions_total.labels(
        model=model,
        language=language,
        status=status
    ).inc()

    if success:
        stt_transcription_duration_seconds.labels(model=model).observe(processing_duration)
        stt_audio_duration_seconds.labels(model=model).inc(audio_duration)


def track_voice_clone(clone_type: str, success: bool):
    """Track voice clone creation"""
    status = "success" if success else "error"
    voice_clones_total.labels(type=clone_type, status=status).inc()


def track_credits_usage(user_plan: str, feature: str, amount: int):
    """Track credits usage"""
    credits_used_total.labels(
        user_plan=user_plan,
        feature=feature
    ).inc(amount)


def get_metrics():
    """Get all metrics in Prometheus format"""
    return generate_latest(registry)


def get_metrics_content_type():
    """Get content type for Prometheus metrics"""
    return CONTENT_TYPE_LATEST


def update_gpu_metrics():
    """Update GPU memory metrics (call periodically)"""
    try:
        import torch
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                memory_allocated = torch.cuda.memory_allocated(i)
                gpu_memory_usage_bytes.labels(device=f"cuda:{i}").set(memory_allocated)
    except ImportError:
        pass


# Decorator for tracking function metrics
def track_duration(metric_name: str, labels: dict = None):
    """Decorator to track function duration"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                # Log duration to appropriate metric
                if "tts" in metric_name.lower():
                    tts_generation_duration_seconds.labels(**(labels or {})).observe(duration)
                elif "stt" in metric_name.lower():
                    stt_transcription_duration_seconds.labels(**(labels or {})).observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
