"""
User-related Pydantic schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    FREE = "free"
    STARTER = "starter"
    CREATOR = "creator"
    PRO = "pro"
    SCALE = "scale"
    ENTERPRISE = "enterprise"


class UserCreate(BaseModel):
    """User registration schema"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: EmailStr
    name: str
    plan: PlanType
    credits_remaining: int
    credits_limit: int
    created_at: datetime
    is_active: bool


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class TokenResponse(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class APIKeyCreate(BaseModel):
    """API key creation request"""
    name: str = Field(..., min_length=1, max_length=100)
    scopes: Optional[List[str]] = None


class APIKeyResponse(BaseModel):
    """API key response"""
    id: str
    name: str
    key: str  # Only shown on creation
    key_preview: str  # e.g., "vf_abc...xyz"
    scopes: List[str]
    created_at: datetime
    last_used_at: Optional[datetime]
    is_active: bool


class APIKeyListItem(BaseModel):
    """API key list item (without full key)"""
    id: str
    name: str
    key_preview: str
    scopes: List[str]
    created_at: datetime
    last_used_at: Optional[datetime]
    is_active: bool


class UsageStats(BaseModel):
    """User usage statistics"""
    period_start: datetime
    period_end: datetime
    credits_used: int
    credits_remaining: int
    tts_characters: int
    stt_minutes: float
    voice_clones_created: int
    sfx_generated: int
    api_requests: int


class CreditTransaction(BaseModel):
    """Credit transaction record"""
    id: str
    timestamp: datetime
    type: str  # tts, stt, voice_clone, sfx, purchase, bonus
    amount: int  # positive for credits added, negative for used
    description: str
    balance_after: int
