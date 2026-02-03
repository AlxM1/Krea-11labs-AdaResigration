"""
VoiceForge Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "VoiceForge"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_KEY_HEADER: str = "X-API-Key"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voiceforge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_TYPE: str = "local"  # local, s3
    STORAGE_PATH: str = "./storage"
    S3_BUCKET: Optional[str] = None
    S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # AI Models
    TTS_MODEL: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    WHISPER_MODEL: str = "large-v3"
    DEVICE: str = "cuda"  # cuda, cpu

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Audio Settings
    MAX_AUDIO_DURATION_SECONDS: int = 600  # 10 minutes
    MAX_FILE_SIZE_MB: int = 100
    SUPPORTED_AUDIO_FORMATS: List[str] = ["mp3", "wav", "flac", "ogg", "m4a"]
    DEFAULT_SAMPLE_RATE: int = 24000
    DEFAULT_OUTPUT_FORMAT: str = "mp3"

    # Voice Cloning
    MIN_CLONE_AUDIO_SECONDS: int = 5
    MAX_CLONE_AUDIO_SECONDS: int = 300  # 5 minutes

    # Credits System
    CREDITS_PER_CHARACTER: float = 1.0
    CREDITS_PER_MINUTE_STT: float = 100.0
    CREDITS_PER_SFX_GENERATION: float = 500.0

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
