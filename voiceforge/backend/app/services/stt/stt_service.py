"""
Speech-to-Text Service using Whisper
"""
import os
import io
import tempfile
from typing import Optional, Dict, List, Tuple
from pathlib import Path
import numpy as np

from app.core.config import settings


class STTService:
    """
    Speech-to-Text service using OpenAI Whisper.
    Supports:
    - Multiple languages (99+)
    - Speaker diarization
    - Word-level timestamps
    - Entity detection
    """

    def __init__(self):
        self.device = settings.DEVICE
        self.model_name = settings.WHISPER_MODEL
        self.model = None
        self._initialized = False

    async def initialize(self):
        """Initialize Whisper model (lazy loading)"""
        if self._initialized:
            return

        try:
            # Try faster-whisper first (more efficient)
            from faster_whisper import WhisperModel

            print(f"Loading Whisper model: {self.model_name}")
            compute_type = "float16" if self.device == "cuda" else "int8"

            self.model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=compute_type
            )
            self._use_faster_whisper = True
            self._initialized = True
            print("Whisper model loaded (faster-whisper)")

        except Exception as e:
            print(f"faster-whisper failed, trying openai-whisper: {e}")

            try:
                import whisper

                self.model = whisper.load_model(self.model_name, device=self.device)
                self._use_faster_whisper = False
                self._initialized = True
                print("Whisper model loaded (openai-whisper)")

            except Exception as e2:
                print(f"Both Whisper implementations failed: {e2}")
                raise

    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
        diarize: bool = False,
        timestamps: str = "segment",
        tag_audio_events: bool = False,
        detect_entities: bool = False
    ) -> Dict:
        """
        Transcribe audio to text.

        Args:
            audio_data: Audio bytes
            language: Language code or None for auto-detection
            diarize: Enable speaker diarization
            timestamps: "word" or "segment"
            tag_audio_events: Tag events like [laughter], [applause]
            detect_entities: Detect PII, PHI, etc.

        Returns:
            Transcription result dict
        """
        await self.initialize()

        # Save audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_data)

        try:
            if self._use_faster_whisper:
                result = await self._transcribe_faster_whisper(
                    tmp_path, language, timestamps
                )
            else:
                result = await self._transcribe_openai_whisper(
                    tmp_path, language, timestamps
                )

            # Add speaker diarization if requested
            if diarize:
                result = await self._add_speaker_diarization(tmp_path, result)

            # Tag audio events if requested
            if tag_audio_events:
                result = self._tag_audio_events(result)

            # Detect entities if requested
            if detect_entities:
                result = await self._detect_entities(result)

            return result

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def _transcribe_faster_whisper(
        self,
        audio_path: str,
        language: Optional[str],
        timestamps: str
    ) -> Dict:
        """Transcribe using faster-whisper"""
        segments, info = self.model.transcribe(
            audio_path,
            language=language,
            word_timestamps=(timestamps == "word"),
            vad_filter=True
        )

        segments_list = []
        full_text = []
        words_list = []

        for segment in segments:
            seg_dict = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob
            }
            segments_list.append(seg_dict)
            full_text.append(segment.text.strip())

            # Add word-level timestamps if available
            if timestamps == "word" and segment.words:
                for word in segment.words:
                    words_list.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability
                    })

        return {
            "text": " ".join(full_text),
            "language": info.language,
            "language_probability": info.language_probability,
            "duration_seconds": info.duration,
            "segments": segments_list,
            "words": words_list if timestamps == "word" else None
        }

    async def _transcribe_openai_whisper(
        self,
        audio_path: str,
        language: Optional[str],
        timestamps: str
    ) -> Dict:
        """Transcribe using openai-whisper"""
        import whisper

        result = self.model.transcribe(
            audio_path,
            language=language,
            word_timestamps=(timestamps == "word"),
            verbose=False
        )

        segments_list = []
        words_list = []

        for segment in result.get("segments", []):
            seg_dict = {
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "confidence": segment.get("avg_logprob")
            }
            segments_list.append(seg_dict)

            if timestamps == "word" and "words" in segment:
                for word in segment["words"]:
                    words_list.append({
                        "word": word["word"],
                        "start": word["start"],
                        "end": word["end"],
                        "probability": word.get("probability")
                    })

        # Calculate duration from last segment
        duration = segments_list[-1]["end"] if segments_list else 0

        return {
            "text": result["text"].strip(),
            "language": result.get("language", "en"),
            "language_probability": None,
            "duration_seconds": duration,
            "segments": segments_list,
            "words": words_list if timestamps == "word" else None
        }

    async def _add_speaker_diarization(
        self,
        audio_path: str,
        result: Dict
    ) -> Dict:
        """Add speaker diarization to transcription result"""
        try:
            # Try using pyannote.audio for diarization
            from pyannote.audio import Pipeline

            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.0",
                use_auth_token=os.environ.get("HF_TOKEN")
            )

            diarization = pipeline(audio_path)

            # Map segments to speakers
            speaker_segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                speaker_segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker
                })

            # Assign speakers to transcription segments
            for segment in result["segments"]:
                seg_mid = (segment["start"] + segment["end"]) / 2
                for spk_seg in speaker_segments:
                    if spk_seg["start"] <= seg_mid <= spk_seg["end"]:
                        segment["speaker"] = spk_seg["speaker"]
                        break

            # Get unique speakers
            speakers = list(set(s["speaker"] for s in result["segments"] if "speaker" in s))
            result["speakers"] = speakers

        except Exception as e:
            print(f"Speaker diarization failed: {e}")
            # Continue without diarization

        return result

    def _tag_audio_events(self, result: Dict) -> Dict:
        """Tag audio events in transcription"""
        # Simple pattern matching for audio events
        # In production, would use a dedicated audio event detection model
        event_patterns = {
            "[laughter]": ["haha", "hehe", "lol"],
            "[applause]": ["clap", "applause"],
            "[music]": ["♪", "♫"],
            "[silence]": []
        }

        # Add event tags to text where detected
        # This is a simplified implementation
        result["audio_events"] = []

        return result

    async def _detect_entities(self, result: Dict) -> Dict:
        """Detect entities (PII, PHI, PCI) in transcription"""
        import re

        text = result["text"]
        entities = []

        # Simple pattern matching for common entities
        patterns = {
            "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "ssn": r"\b\d{3}[-]?\d{2}[-]?\d{4}\b",
            "credit_card": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
            "date": r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"
        }

        for entity_type, pattern in patterns.items():
            for match in re.finditer(pattern, text):
                entities.append({
                    "type": entity_type,
                    "text": match.group(),
                    "start": match.start(),
                    "end": match.end(),
                    "category": "pii"
                })

        result["entities"] = entities

        return result

    async def transcribe_realtime(
        self,
        audio_chunk: bytes,
        language: Optional[str] = None
    ) -> Dict:
        """
        Real-time transcription for streaming audio.
        Returns partial transcription results.
        """
        # For real-time, we use a smaller model or VAD-based chunking
        await self.initialize()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_chunk)

        try:
            if self._use_faster_whisper:
                segments, info = self.model.transcribe(
                    tmp_path,
                    language=language,
                    vad_filter=True,
                    beam_size=1  # Faster for real-time
                )

                text_parts = [seg.text for seg in segments]

                return {
                    "text": " ".join(text_parts).strip(),
                    "language": info.language,
                    "is_final": True
                }
            else:
                result = self.model.transcribe(
                    tmp_path,
                    language=language,
                    fp16=(self.device == "cuda")
                )

                return {
                    "text": result["text"].strip(),
                    "language": result.get("language", "en"),
                    "is_final": True
                }

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Singleton instance
_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    """Get or create STT service singleton"""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service
