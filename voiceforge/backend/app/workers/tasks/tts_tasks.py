"""
Text-to-Speech background tasks
"""
from celery import shared_task
from typing import Optional, Dict, Any
import tempfile
import os

from app.workers.celery_app import celery_app
from app.services.storage import get_storage_service
from app.core.config import settings


@celery_app.task(
    bind=True,
    name="tts.generate",
    queue="tts",
    max_retries=3,
    soft_time_limit=300,
    time_limit=360
)
def generate_speech_task(
    self,
    text: str,
    voice_id: str,
    user_id: str,
    generation_id: str,
    model_id: str = "xtts_v2",
    output_format: str = "mp3",
    settings_dict: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Background task for TTS generation.

    Args:
        text: Text to convert to speech
        voice_id: Voice ID to use
        user_id: User ID for tracking
        generation_id: Generation ID for result storage
        model_id: TTS model to use
        output_format: Output audio format
        settings_dict: Voice settings (stability, similarity, etc.)

    Returns:
        Result dictionary with audio URL and metadata
    """
    import asyncio
    from app.services.tts.tts_service import get_tts_service

    try:
        # Update task state
        self.update_state(state="PROCESSING", meta={"progress": 10})

        # Get TTS service
        tts_service = get_tts_service()

        # Initialize model if needed
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(tts_service.initialize())
            self.update_state(state="PROCESSING", meta={"progress": 30})

            # Generate speech
            result = loop.run_until_complete(
                tts_service.synthesize(
                    text=text,
                    voice_id=voice_id,
                    model_id=model_id,
                    output_format=output_format,
                    **settings_dict or {}
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 70})

            # Upload to storage
            storage = get_storage_service()
            audio_url = loop.run_until_complete(
                storage.upload(
                    data=result["audio"],
                    path=f"generations/{user_id}/{generation_id}.{output_format}",
                    content_type=f"audio/{output_format}"
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 90})

            # Update generation record in database
            # TODO: Update database with result

            return {
                "success": True,
                "generation_id": generation_id,
                "audio_url": audio_url,
                "duration_seconds": result.get("duration_seconds", 0),
                "characters_count": len(text),
                "credits_used": len(text)  # 1 credit per character
            }

        finally:
            loop.close()

    except Exception as e:
        # Log error and retry
        self.update_state(state="FAILED", meta={"error": str(e)})

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries * 10)

        return {
            "success": False,
            "generation_id": generation_id,
            "error": str(e)
        }


@celery_app.task(
    bind=True,
    name="tts.generate_streaming",
    queue="priority",
    soft_time_limit=60,
    time_limit=120
)
def generate_speech_streaming_task(
    self,
    text: str,
    voice_id: str,
    user_id: str,
    websocket_channel: str,
    model_id: str = "xtts_v2",
    settings_dict: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Background task for streaming TTS generation.
    Sends audio chunks to a WebSocket channel.
    """
    import asyncio
    import redis
    from app.services.tts.tts_service import get_tts_service

    try:
        tts_service = get_tts_service()
        redis_client = redis.from_url(settings.REDIS_URL)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(tts_service.initialize())

            # Stream audio chunks
            async def stream_audio():
                async for chunk in tts_service.synthesize_streaming(
                    text=text,
                    voice_id=voice_id,
                    model_id=model_id,
                    **settings_dict or {}
                ):
                    # Send chunk to Redis pub/sub
                    redis_client.publish(
                        websocket_channel,
                        chunk
                    )

            loop.run_until_complete(stream_audio())

            # Signal completion
            redis_client.publish(websocket_channel, b"__END__")

            return {"success": True}

        finally:
            loop.close()
            redis_client.close()

    except Exception as e:
        return {"success": False, "error": str(e)}


@celery_app.task(name="tts.batch_generate", queue="tts")
def batch_generate_speech_task(
    texts: list,
    voice_id: str,
    user_id: str,
    batch_id: str,
    model_id: str = "xtts_v2",
    output_format: str = "mp3"
) -> Dict[str, Any]:
    """
    Batch TTS generation for multiple texts.
    Useful for audiobook chapters, etc.
    """
    results = []

    for i, text in enumerate(texts):
        result = generate_speech_task.delay(
            text=text,
            voice_id=voice_id,
            user_id=user_id,
            generation_id=f"{batch_id}_{i}",
            model_id=model_id,
            output_format=output_format
        )
        results.append(result.id)

    return {
        "batch_id": batch_id,
        "task_ids": results,
        "total": len(texts)
    }
