"""
Speech-to-Text background tasks
"""
from celery import shared_task
from typing import Optional, Dict, Any

from app.workers.celery_app import celery_app
from app.services.storage import get_storage_service


@celery_app.task(
    bind=True,
    name="stt.transcribe",
    queue="stt",
    max_retries=3,
    soft_time_limit=600,
    time_limit=660
)
def transcribe_audio_task(
    self,
    audio_url: str,
    user_id: str,
    transcription_id: str,
    language: Optional[str] = None,
    diarize: bool = False,
    timestamps: str = "segment",
    detect_entities: bool = False
) -> Dict[str, Any]:
    """
    Background task for audio transcription.
    """
    import asyncio
    from app.services.stt.stt_service import get_stt_service

    try:
        self.update_state(state="PROCESSING", meta={"progress": 10})

        stt_service = get_stt_service()
        storage = get_storage_service()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Download audio file
            self.update_state(state="PROCESSING", meta={"progress": 20})
            audio_data = loop.run_until_complete(storage.download(audio_url))

            # Initialize STT
            loop.run_until_complete(stt_service.initialize())
            self.update_state(state="PROCESSING", meta={"progress": 40})

            # Transcribe
            result = loop.run_until_complete(
                stt_service.transcribe(
                    audio_data=audio_data,
                    language=language,
                    diarize=diarize,
                    timestamps=timestamps,
                    detect_entities=detect_entities
                )
            )

            self.update_state(state="PROCESSING", meta={"progress": 90})

            return {
                "success": True,
                "transcription_id": transcription_id,
                "text": result["text"],
                "language": result["language"],
                "duration_seconds": result["duration_seconds"],
                "segments": result.get("segments", []),
                "speakers": result.get("speakers"),
                "words": result.get("words"),
                "entities": result.get("entities")
            }

        finally:
            loop.close()

    except Exception as e:
        self.update_state(state="FAILED", meta={"error": str(e)})

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries * 10)

        return {
            "success": False,
            "transcription_id": transcription_id,
            "error": str(e)
        }


@celery_app.task(
    bind=True,
    name="stt.batch_transcribe",
    queue="stt"
)
def batch_transcribe_task(
    self,
    audio_urls: list,
    user_id: str,
    batch_id: str,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """
    Batch transcription for multiple audio files.
    """
    results = []

    for i, url in enumerate(audio_urls):
        result = transcribe_audio_task.delay(
            audio_url=url,
            user_id=user_id,
            transcription_id=f"{batch_id}_{i}",
            language=language
        )
        results.append(result.id)

    return {
        "batch_id": batch_id,
        "task_ids": results,
        "total": len(audio_urls)
    }
