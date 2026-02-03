"""
VoiceForge Configuration
Production-ready settings with environment variable support
"""
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache
import os


class Settings(BaseSettings):
    # ==========================================
    # Application
    # ==========================================
    APP_NAME: str = "VoiceForge"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ==========================================
    # Server
    # ==========================================
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    RELOAD: bool = False

    # ==========================================
    # Security
    # ==========================================
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    API_KEY_HEADER: str = "X-API-Key"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # ==========================================
    # Database
    # ==========================================
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voiceforge"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False

    # ==========================================
    # Redis
    # ==========================================
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50

    # ==========================================
    # Storage
    # ==========================================
    STORAGE_TYPE: str = "local"  # local, s3, gcs
    STORAGE_PATH: str = "./storage"

    # S3 Settings
    S3_BUCKET: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: Optional[str] = None  # For S3-compatible services
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # GCS Settings
    GCS_BUCKET: Optional[str] = None
    GCS_CREDENTIALS_PATH: Optional[str] = None

    # CDN
    CDN_URL: Optional[str] = None

    # ==========================================
    # AI Models
    # ==========================================
    TTS_MODEL: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    WHISPER_MODEL: str = "large-v3"
    SFX_MODEL: str = "audioldm2-full-large-1150k"
    DEVICE: str = "cuda"  # cuda, cpu, mps

    # Model paths (for custom/local models)
    MODELS_PATH: str = "./models"

    # ==========================================
    # Rate Limiting
    # ==========================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # ==========================================
    # Audio Settings
    # ==========================================
    MAX_AUDIO_DURATION_SECONDS: int = 600  # 10 minutes
    MAX_FILE_SIZE_MB: int = 100
    SUPPORTED_AUDIO_FORMATS: List[str] = ["mp3", "wav", "flac", "ogg", "m4a", "webm"]
    DEFAULT_SAMPLE_RATE: int = 24000
    DEFAULT_OUTPUT_FORMAT: str = "mp3"

    # ==========================================
    # Voice Cloning
    # ==========================================
    MIN_CLONE_AUDIO_SECONDS: int = 5
    MAX_CLONE_AUDIO_SECONDS: int = 300  # 5 minutes
    MAX_CLONE_FILES: int = 10

    # ==========================================
    # Credits System
    # ==========================================
    CREDITS_PER_CHARACTER: float = 1.0
    CREDITS_PER_MINUTE_STT: float = 100.0
    CREDITS_PER_SFX_GENERATION: float = 500.0
    CREDITS_PER_VOICE_CLONE: float = 1000.0
    CREDITS_PER_MINUTE_ISOLATION: float = 100.0

    # ==========================================
    # Billing (Stripe)
    # ==========================================
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Stripe Price IDs
    STRIPE_STARTER_PRICE_ID: Optional[str] = None
    STRIPE_CREATOR_PRICE_ID: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None
    STRIPE_SCALE_PRICE_ID: Optional[str] = None

    # ==========================================
    # Monitoring & Logging
    # ==========================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json, text

    # Sentry
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1

    # Prometheus
    PROMETHEUS_ENABLED: bool = True

    # ==========================================
    # LLM Integration (for Conversational AI)
    # ==========================================
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4-turbo-preview"

    # ==========================================
    # External Services
    # ==========================================
    # Hugging Face (for model downloads)
    HF_TOKEN: Optional[str] = None

    # ==========================================
    # Feature Flags
    # ==========================================
    ENABLE_VOICE_CLONING: bool = True
    ENABLE_SOUND_EFFECTS: bool = True
    ENABLE_VOICE_ISOLATION: bool = True
    ENABLE_CONVERSATIONAL_AI: bool = True
    ENABLE_STREAMING: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()


def get_database_url() -> str:
    """Get database URL, handling test environment"""
    if settings.ENVIRONMENT == "test":
        return "sqlite+aiosqlite:///./test.db"
    return settings.DATABASE_URL
