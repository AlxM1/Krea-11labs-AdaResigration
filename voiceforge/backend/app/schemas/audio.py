"""
Audio-related Pydantic schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from enum import Enum
from datetime import datetime


class OutputFormat(str, Enum):
    MP3 = "mp3"
    WAV = "wav"
    PCM = "pcm"
    OGG = "ogg"
    FLAC = "flac"


class VoiceSettings(BaseModel):
    """Voice generation settings"""
    stability: float = Field(default=0.5, ge=0, le=1, description="Voice stability (0-1)")
    similarity_boost: float = Field(default=0.75, ge=0, le=1, description="Voice similarity boost (0-1)")
    style: float = Field(default=0.0, ge=0, le=1, description="Speaking style exaggeration (0-1)")
    use_speaker_boost: bool = Field(default=True, description="Enable speaker boost")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speaking speed multiplier")


class TTSRequest(BaseModel):
    """Text-to-Speech request schema"""
    text: str = Field(..., min_length=1, max_length=40000, description="Text to convert to speech")
    voice_id: str = Field(..., description="Voice ID to use for generation")
    model_id: str = Field(default="eleven_multilingual_v2", description="Model ID")
    voice_settings: Optional[VoiceSettings] = None
    output_format: OutputFormat = Field(default=OutputFormat.MP3)
    sample_rate: Optional[int] = Field(default=None, description="Sample rate (e.g., 22050, 44100)")
    language_code: Optional[str] = Field(default=None, description="Language code (e.g., 'en', 'es')")

    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty or whitespace only')
        return v


class TTSResponse(BaseModel):
    """Text-to-Speech response schema"""
    audio_url: str
    duration_seconds: float
    characters_used: int
    model_id: str
    voice_id: str
    format: str
    sample_rate: int


class TTSStreamRequest(BaseModel):
    """Streaming TTS request schema"""
    text: str = Field(..., min_length=1, max_length=40000)
    voice_id: str
    model_id: str = Field(default="eleven_flash_v2_5")
    voice_settings: Optional[VoiceSettings] = None
    output_format: OutputFormat = Field(default=OutputFormat.MP3)


class VoiceCloneRequest(BaseModel):
    """Voice cloning request schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Name for the cloned voice")
    description: Optional[str] = Field(default=None, max_length=500)
    labels: Optional[dict] = Field(default=None, description="Voice labels/tags")


class VoiceCloneResponse(BaseModel):
    """Voice cloning response schema"""
    voice_id: str
    name: str
    description: Optional[str]
    preview_url: Optional[str]
    created_at: datetime
    labels: Optional[dict]
    clone_type: Literal["instant", "professional"]


class Voice(BaseModel):
    """Voice model schema"""
    voice_id: str
    name: str
    description: Optional[str] = None
    preview_url: Optional[str] = None
    category: str = "generated"  # premade, cloned, generated, professional
    labels: Optional[dict] = None
    language: Optional[str] = None
    created_at: Optional[datetime] = None
    is_public: bool = False


class VoiceListResponse(BaseModel):
    """Voice list response schema"""
    voices: List[Voice]
    total: int


class STTRequest(BaseModel):
    """Speech-to-Text request schema"""
    language: Optional[str] = Field(default=None, description="Language code or 'auto' for detection")
    model: str = Field(default="scribe_v2", description="STT model to use")
    diarize: bool = Field(default=False, description="Enable speaker diarization")
    timestamps: Literal["word", "segment"] = Field(default="segment")
    tag_audio_events: bool = Field(default=False)
    detect_entities: bool = Field(default=False)


class TranscriptionSegment(BaseModel):
    """Transcription segment with timing"""
    start: float
    end: float
    text: str
    speaker: Optional[str] = None
    confidence: Optional[float] = None


class STTResponse(BaseModel):
    """Speech-to-Text response schema"""
    text: str
    language: str
    duration_seconds: float
    segments: List[TranscriptionSegment]
    speakers: Optional[List[str]] = None
    words: Optional[List[dict]] = None


class SoundEffectRequest(BaseModel):
    """Sound effect generation request schema"""
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text description of sound effect")
    duration_seconds: float = Field(default=5.0, ge=0.5, le=30.0)
    prompt_influence: float = Field(default=0.3, ge=0, le=1)
    output_format: OutputFormat = Field(default=OutputFormat.MP3)


class SoundEffectResponse(BaseModel):
    """Sound effect generation response schema"""
    audio_url: str
    duration_seconds: float
    prompt: str


class VoiceIsolationRequest(BaseModel):
    """Voice isolation request schema"""
    # Audio file is uploaded separately
    pass


class VoiceIsolationResponse(BaseModel):
    """Voice isolation response schema"""
    vocals_url: str
    background_url: Optional[str] = None
    duration_seconds: float


class AudioInfo(BaseModel):
    """Audio file information"""
    duration_seconds: float
    sample_rate: int
    channels: int
    format: str
    file_size_bytes: int
