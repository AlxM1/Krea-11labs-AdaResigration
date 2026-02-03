"""
Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List

from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    APIKeyCreate, APIKeyResponse, APIKeyListItem, UsageStats
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    generate_api_key, hash_api_key, get_current_user
)
from app.core.config import settings

router = APIRouter()

# In-memory user store (replace with database in production)
_users_db = {}
_api_keys_db = {}


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """
    Register a new user account.
    """
    # Check if email already exists
    if user_data.email in _users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    import uuid
    user_id = str(uuid.uuid4())

    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": get_password_hash(user_data.password),
        "plan": "free",
        "credits_remaining": 10000,
        "credits_limit": 10000,
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }

    _users_db[user_data.email] = user

    # Create access token
    access_token = create_access_token(
        subject=user_id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            plan=user["plan"],
            credits_remaining=user["credits_remaining"],
            credits_limit=user["credits_limit"],
            created_at=user["created_at"],
            is_active=user["is_active"]
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login with email and password.
    """
    user = _users_db.get(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    access_token = create_access_token(
        subject=user["id"],
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            plan=user["plan"],
            credits_remaining=user["credits_remaining"],
            credits_limit=user["credits_limit"],
            created_at=user["created_at"],
            is_active=user["is_active"]
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information.
    """
    # Find user by ID
    for user in _users_db.values():
        if user["id"] == current_user["user_id"]:
            return UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                plan=user["plan"],
                credits_remaining=user["credits_remaining"],
                credits_limit=user["credits_limit"],
                created_at=user["created_at"],
                is_active=user["is_active"]
            )

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new API key.
    """
    import uuid
    from datetime import datetime

    key_id = str(uuid.uuid4())
    api_key = generate_api_key()
    key_hash = hash_api_key(api_key)

    api_key_record = {
        "id": key_id,
        "user_id": current_user["user_id"],
        "name": key_data.name,
        "key_hash": key_hash,
        "key_preview": f"{api_key[:7]}...{api_key[-4:]}",
        "scopes": key_data.scopes or ["*"],
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "last_used_at": None
    }

    _api_keys_db[key_hash] = api_key_record

    return APIKeyResponse(
        id=key_id,
        name=key_data.name,
        key=api_key,  # Only shown once on creation
        key_preview=api_key_record["key_preview"],
        scopes=api_key_record["scopes"],
        created_at=api_key_record["created_at"],
        last_used_at=None,
        is_active=True
    )


@router.get("/api-keys", response_model=List[APIKeyListItem])
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    """
    List all API keys for the current user.
    """
    user_keys = [
        APIKeyListItem(
            id=key["id"],
            name=key["name"],
            key_preview=key["key_preview"],
            scopes=key["scopes"],
            created_at=key["created_at"],
            last_used_at=key["last_used_at"],
            is_active=key["is_active"]
        )
        for key in _api_keys_db.values()
        if key["user_id"] == current_user["user_id"]
    ]

    return user_keys


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an API key.
    """
    for key_hash, key in list(_api_keys_db.items()):
        if key["id"] == key_id and key["user_id"] == current_user["user_id"]:
            del _api_keys_db[key_hash]
            return {"status": "ok", "message": "API key deleted"}

    raise HTTPException(status_code=404, detail="API key not found")


@router.get("/usage", response_model=UsageStats)
async def get_usage_stats(current_user: dict = Depends(get_current_user)):
    """
    Get usage statistics for the current billing period.
    """
    from datetime import datetime

    # TODO: Implement actual usage tracking

    return UsageStats(
        period_start=datetime.utcnow().replace(day=1).isoformat(),
        period_end=datetime.utcnow().isoformat(),
        credits_used=0,
        credits_remaining=10000,
        tts_characters=0,
        stt_minutes=0.0,
        voice_clones_created=0,
        sfx_generated=0,
        api_requests=0
    )


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh access token.
    """
    access_token = create_access_token(
        subject=current_user["user_id"],
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
