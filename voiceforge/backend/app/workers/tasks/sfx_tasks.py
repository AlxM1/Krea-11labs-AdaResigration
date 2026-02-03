"""
Sound Effects generation background tasks
"""
from typing import Optional, Dict, Any

from app.workers.celery_app import celery_app
from app.services.storage import get_storage_service


@celery_app.task(
    bind=True,
    name="sfx.generate",
    queue="sfx",
    max_retries=3,
    soft_time_limit=120,
    time_limit=180
)
def generate_sfx_task(
    self,
    prompt: str,
    user_id: str,
    generation_id: str,
    duration_seconds: float = 5.0,
    output_format: str = "mp3"
) -> Dict[str, Any]:
    """
    Background task for sound effects generation.
    """
    import asyncio
    from app.services.sound_effects.sfx_service import get_sfx_service

    try:
        self.update_state(state="PROCESSING", meta={"progress": 10})

        sfx_service = get_sfx_service()
        storage = get_storage_service()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Initialize model
            loop.run_until_complete(sfx_service.initialize())
            self.update_state(state="PROCESSING", meta={"progress": 30})

            # Generate sound effect
            result = loop.run_until_complete(
                sfx_service.generate(
                    prompt=prompt,
                    duration_seconds=duration_seconds,
                    output_format=output_format
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 70})

            # Upload to storage
            audio_url = loop.run_until_complete(
                storage.upload(
                    data=result["audio"],
                    path=f"sfx/{user_id}/{generation_id}.{output_format}",
                    content_type=f"audio/{output_format}"
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 100})

            return {
                "success": True,
                "generation_id": generation_id,
                "audio_url": audio_url,
                "duration_seconds": result.get("duration_seconds", duration_seconds),
                "prompt": prompt
            }

        finally:
            loop.close()

    except Exception as e:
        self.update_state(state="FAILED", meta={"error": str(e)})

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries * 5)

        return {
            "success": False,
            "generation_id": generation_id,
            "error": str(e)
        }
