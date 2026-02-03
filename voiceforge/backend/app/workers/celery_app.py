"""
Celery application configuration for background task processing
"""
from celery import Celery
from kombu import Queue, Exchange
import os

# Redis URL for Celery broker and backend
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Create Celery application
celery_app = Celery(
    "voiceforge",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.workers.tasks.tts_tasks",
        "app.workers.tasks.stt_tasks",
        "app.workers.tasks.voice_tasks",
        "app.workers.tasks.sfx_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=600,  # 10 minutes max per task
    task_soft_time_limit=540,  # Soft limit at 9 minutes

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,

    # Worker settings
    worker_prefetch_multiplier=1,  # One task at a time for GPU tasks
    worker_concurrency=2,  # 2 concurrent workers per node

    # Queue settings
    task_default_queue="default",
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("tts", Exchange("tts"), routing_key="tts.#"),
        Queue("stt", Exchange("stt"), routing_key="stt.#"),
        Queue("voice", Exchange("voice"), routing_key="voice.#"),
        Queue("sfx", Exchange("sfx"), routing_key="sfx.#"),
        Queue("priority", Exchange("priority"), routing_key="priority.#"),
    ),

    # Task routing
    task_routes={
        "app.workers.tasks.tts_tasks.*": {"queue": "tts"},
        "app.workers.tasks.stt_tasks.*": {"queue": "stt"},
        "app.workers.tasks.voice_tasks.*": {"queue": "voice"},
        "app.workers.tasks.sfx_tasks.*": {"queue": "sfx"},
    },

    # Retry settings
    task_autoretry_for=(Exception,),
    task_retry_backoff=True,
    task_retry_backoff_max=600,
    task_retry_jitter=True,
    task_max_retries=3,

    # Beat scheduler (for periodic tasks)
    beat_schedule={
        "cleanup-expired-files": {
            "task": "app.workers.tasks.cleanup.cleanup_expired_files",
            "schedule": 3600.0,  # Every hour
        },
        "update-usage-stats": {
            "task": "app.workers.tasks.analytics.update_usage_stats",
            "schedule": 300.0,  # Every 5 minutes
        },
    },
)


# Task priority levels
class TaskPriority:
    LOW = 1
    NORMAL = 5
    HIGH = 8
    CRITICAL = 10


def get_celery_app() -> Celery:
    """Get the Celery application instance"""
    return celery_app
