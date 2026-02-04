"""
Database models using SQLAlchemy
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, Enum as SQLEnum, BigInteger
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid
import enum

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class PlanType(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    CREATOR = "creator"
    PRO = "pro"
    SCALE = "scale"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    plan = Column(SQLEnum(PlanType), default=PlanType.FREE)
    credits_remaining = Column(BigInteger, default=10000)  # Free tier: 10k credits
    credits_limit = Column(BigInteger, default=10000)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    voices = relationship("Voice", back_populates="user", cascade="all, delete-orphan")
    generations = relationship("Generation", back_populates="user", cascade="all, delete-orphan")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    key_preview = Column(String(20), nullable=False)  # e.g., "vf_abc...xyz"
    scopes = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class Voice(Base):
    __tablename__ = "voices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Null for system voices
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="cloned")  # premade, cloned, generated, professional
    language = Column(String(10), nullable=True)
    labels = Column(JSON, default=dict)

    # Audio references
    preview_url = Column(String(500), nullable=True)
    model_path = Column(String(500), nullable=True)  # Path to voice model/embedding
    reference_audio_path = Column(String(500), nullable=True)

    # Settings
    default_settings = Column(JSON, default=dict)

    # Metadata
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    clone_type = Column(String(20), default="instant")  # instant, professional
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="voices")
    generations = relationship("Generation", back_populates="voice")


class Generation(Base):
    __tablename__ = "generations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    voice_id = Column(String(36), ForeignKey("voices.id"), nullable=True)

    # Generation details
    type = Column(String(20), nullable=False)  # tts, stt, sfx, isolation, dubbing
    model_id = Column(String(100), nullable=True)

    # Input
    input_text = Column(Text, nullable=True)
    input_audio_url = Column(String(500), nullable=True)

    # Output
    output_url = Column(String(500), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Costs
    characters_count = Column(Integer, default=0)
    credits_used = Column(Integer, default=0)

    # Metadata
    settings = Column(JSON, default=dict)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="generations")
    voice = relationship("Voice", back_populates="generations")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    type = Column(String(20), nullable=False)  # usage, purchase, bonus, refund
    amount = Column(Integer, nullable=False)  # Positive = credit, Negative = debit
    balance_after = Column(BigInteger, nullable=False)

    description = Column(String(255), nullable=True)
    reference_id = Column(String(36), nullable=True)  # Generation ID, payment ID, etc.

    created_at = Column(DateTime, default=func.now())


class SystemVoice(Base):
    """Pre-made system voices available to all users"""
    __tablename__ = "system_voices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="premade")
    language = Column(String(10), nullable=True)
    gender = Column(String(20), nullable=True)
    age = Column(String(20), nullable=True)
    accent = Column(String(50), nullable=True)
    use_case = Column(String(100), nullable=True)  # narration, conversational, news, etc.

    preview_url = Column(String(500), nullable=True)
    model_id = Column(String(100), nullable=False)
    speaker_id = Column(String(100), nullable=True)

    labels = Column(JSON, default=dict)
    default_settings = Column(JSON, default=dict)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class VoiceSource(str, enum.Enum):
    """Sources for voice library"""
    XTTS_BUILTIN = "xtts_builtin"
    LIBRI_TTS = "libri_tts"
    VCTK = "vctk"
    COMMON_VOICE = "common_voice"
    LJ_SPEECH = "lj_speech"
    HIFI_TTS = "hifi_tts"
    BARK = "bark"
    SPEECHT5 = "speecht5"
    CUSTOM = "custom"


class LibraryVoice(Base):
    """Voices from external free sources"""
    __tablename__ = "library_voices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source = Column(SQLEnum(VoiceSource), nullable=False)
    source_id = Column(String(100), nullable=False)  # Original ID from source

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Speaker attributes
    gender = Column(String(20), nullable=True)
    age = Column(String(20), nullable=True)
    accent = Column(String(100), nullable=True)
    language = Column(String(20), default="en")
    language_name = Column(String(100), nullable=True)

    # Quality and style
    quality = Column(String(20), default="standard")  # standard, high, studio
    style = Column(String(100), nullable=True)  # narration, conversational, expressive
    emotion_range = Column(String(100), nullable=True)

    # File references
    preview_url = Column(String(500), nullable=True)
    sample_audio_url = Column(String(500), nullable=True)
    embedding_path = Column(String(500), nullable=True)  # Cached speaker embedding
    reference_audio_path = Column(String(500), nullable=True)

    # Download/cache status
    is_downloaded = Column(Boolean, default=False)
    download_size_mb = Column(Float, nullable=True)
    cached_at = Column(DateTime, nullable=True)

    # Metadata
    license = Column(String(100), nullable=True)
    attribution = Column(Text, nullable=True)
    source_url = Column(String(500), nullable=True)
    labels = Column(JSON, default=dict)

    # Stats
    downloads_count = Column(Integer, default=0)
    rating = Column(Float, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Unique constraint on source + source_id
    __table_args__ = (
        {'extend_existing': True}
    )


class UserLibraryVoice(Base):
    """Tracks which library voices a user has added to their collection"""
    __tablename__ = "user_library_voices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    library_voice_id = Column(String(36), ForeignKey("library_voices.id"), nullable=False)

    # User customization
    custom_name = Column(String(100), nullable=True)
    custom_settings = Column(JSON, default=dict)
    is_favorite = Column(Boolean, default=False)

    added_at = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)
