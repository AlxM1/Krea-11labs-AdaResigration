"""
Voice cloning background tasks
"""
from celery import shared_task
from typing import Optional, Dict, Any, List

from app.workers.celery_app import celery_app
from app.services.storage import get_storage_service


@celery_app.task(
    bind=True,
    name="voice.clone",
    queue="voice",
    max_retries=2,
    soft_time_limit=300,
    time_limit=360
)
def clone_voice_task(
    self,
    audio_urls: List[str],
    user_id: str,
    voice_id: str,
    voice_name: str,
    description: Optional[str] = None,
    clone_type: str = "instant"
) -> Dict[str, Any]:
    """
    Background task for voice cloning.
    """
    import asyncio
    from app.services.voice_cloning.clone_service import get_clone_service

    try:
        self.update_state(state="PROCESSING", meta={"progress": 10, "step": "downloading"})

        clone_service = get_clone_service()
        storage = get_storage_service()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Download audio files
            audio_samples = []
            for i, url in enumerate(audio_urls):
                self.update_state(
                    state="PROCESSING",
                    meta={"progress": 10 + (i * 20 // len(audio_urls)), "step": "downloading"}
                )
                audio_data = loop.run_until_complete(storage.download(url))
                audio_samples.append(audio_data)

            # Initialize cloning service
            loop.run_until_complete(clone_service.initialize())
            self.update_state(state="PROCESSING", meta={"progress": 40, "step": "analyzing"})

            # Clone voice
            result = loop.run_until_complete(
                clone_service.clone_voice(
                    audio_samples=audio_samples,
                    voice_name=voice_name,
                    clone_type=clone_type
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 80, "step": "saving"})

            # Save voice model/embedding to storage
            if result.get("model_data"):
                model_path = f"voices/{user_id}/{voice_id}/model.pt"
                model_url = loop.run_until_complete(
                    storage.upload(
                        data=result["model_data"],
                        path=model_path,
                        content_type="application/octet-stream"
                    )
                )
                result["model_url"] = model_url

            # Save preview audio
            if result.get("preview_audio"):
                preview_path = f"voices/{user_id}/{voice_id}/preview.mp3"
                preview_url = loop.run_until_complete(
                    storage.upload(
                        data=result["preview_audio"],
                        path=preview_path,
                        content_type="audio/mpeg"
                    )
                )
                result["preview_url"] = preview_url

            self.update_state(state="PROCESSING", meta={"progress": 100, "step": "complete"})

            return {
                "success": True,
                "voice_id": voice_id,
                "voice_name": voice_name,
                "model_url": result.get("model_url"),
                "preview_url": result.get("preview_url"),
                "speaker_embedding": result.get("speaker_embedding")
            }

        finally:
            loop.close()

    except Exception as e:
        self.update_state(state="FAILED", meta={"error": str(e)})

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries * 30)

        return {
            "success": False,
            "voice_id": voice_id,
            "error": str(e)
        }


@celery_app.task(
    name="voice.delete",
    queue="voice"
)
def delete_voice_task(
    voice_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Delete a cloned voice and its associated files.
    """
    import asyncio
    from app.services.storage import get_storage_service

    storage = get_storage_service()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Delete voice files
        voice_prefix = f"voices/{user_id}/{voice_id}/"

        # Delete model and preview
        loop.run_until_complete(storage.delete(f"{voice_prefix}model.pt"))
        loop.run_until_complete(storage.delete(f"{voice_prefix}preview.mp3"))

        return {"success": True, "voice_id": voice_id}

    except Exception as e:
        return {"success": False, "voice_id": voice_id, "error": str(e)}

    finally:
        loop.close()
