"""
Rate Limiting Middleware
Token bucket algorithm with Redis backend
"""
import time
import hashlib
from typing import Optional, Callable, Dict, Any
from functools import wraps

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
import redis.asyncio as redis

from app.core.config import settings


class RateLimiter:
    """
    Rate limiter using token bucket algorithm with Redis.

    Supports:
    - Per-user rate limiting
    - Per-endpoint rate limiting
    - Per-IP rate limiting (for unauthenticated requests)
    - Sliding window counters
    """

    def __init__(self):
        self.redis: Optional[redis.Redis] = None

    async def init(self):
        """Initialize Redis connection"""
        if self.redis is None:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )

    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()

    def _get_key(
        self,
        identifier: str,
        endpoint: Optional[str] = None,
        window: str = "minute"
    ) -> str:
        """Generate rate limit key"""
        parts = ["ratelimit", identifier]
        if endpoint:
            parts.append(hashlib.md5(endpoint.encode()).hexdigest()[:8])
        parts.append(window)
        return ":".join(parts)

    async def is_allowed(
        self,
        identifier: str,
        limit: int,
        window_seconds: int = 60,
        endpoint: Optional[str] = None
    ) -> tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed under rate limit.

        Args:
            identifier: User ID, API key, or IP address
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
            endpoint: Optional endpoint for per-endpoint limits

        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        await self.init()

        key = self._get_key(identifier, endpoint)
        now = time.time()
        window_start = now - window_seconds

        # Use Redis sorted set for sliding window
        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current entries
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, window_seconds + 1)

        results = await pipe.execute()
        current_count = results[1]

        # Calculate remaining
        remaining = max(0, limit - current_count - 1)
        reset_at = int(now + window_seconds)

        info = {
            "limit": limit,
            "remaining": remaining,
            "reset": reset_at,
            "window_seconds": window_seconds
        }

        if current_count >= limit:
            return False, info

        return True, info

    async def get_usage(
        self,
        identifier: str,
        endpoint: Optional[str] = None,
        window_seconds: int = 60
    ) -> int:
        """Get current usage count"""
        await self.init()

        key = self._get_key(identifier, endpoint)
        now = time.time()
        window_start = now - window_seconds

        # Clean and count
        await self.redis.zremrangebyscore(key, 0, window_start)
        return await self.redis.zcard(key)


# Rate limit configurations by plan
RATE_LIMITS = {
    "free": {
        "tts": {"limit": 10, "window": 60},
        "stt": {"limit": 5, "window": 60},
        "voice_clone": {"limit": 2, "window": 3600},
        "sfx": {"limit": 5, "window": 60},
        "default": {"limit": 60, "window": 60}
    },
    "starter": {
        "tts": {"limit": 30, "window": 60},
        "stt": {"limit": 15, "window": 60},
        "voice_clone": {"limit": 10, "window": 3600},
        "sfx": {"limit": 15, "window": 60},
        "default": {"limit": 120, "window": 60}
    },
    "creator": {
        "tts": {"limit": 60, "window": 60},
        "stt": {"limit": 30, "window": 60},
        "voice_clone": {"limit": 30, "window": 3600},
        "sfx": {"limit": 30, "window": 60},
        "default": {"limit": 300, "window": 60}
    },
    "pro": {
        "tts": {"limit": 120, "window": 60},
        "stt": {"limit": 60, "window": 60},
        "voice_clone": {"limit": 100, "window": 3600},
        "sfx": {"limit": 60, "window": 60},
        "default": {"limit": 600, "window": 60}
    },
    "scale": {
        "tts": {"limit": 300, "window": 60},
        "stt": {"limit": 150, "window": 60},
        "voice_clone": {"limit": 300, "window": 3600},
        "sfx": {"limit": 150, "window": 60},
        "default": {"limit": 1200, "window": 60}
    },
    "enterprise": {
        "tts": {"limit": 1000, "window": 60},
        "stt": {"limit": 500, "window": 60},
        "voice_clone": {"limit": 1000, "window": 3600},
        "sfx": {"limit": 500, "window": 60},
        "default": {"limit": 6000, "window": 60}
    }
}


def get_rate_limit(plan: str, endpoint_type: str) -> Dict[str, int]:
    """Get rate limit for plan and endpoint type"""
    plan_limits = RATE_LIMITS.get(plan, RATE_LIMITS["free"])
    return plan_limits.get(endpoint_type, plan_limits["default"])


# Singleton rate limiter
_rate_limiter: Optional[RateLimiter] = None


async def get_rate_limiter() -> RateLimiter:
    """Get or create rate limiter singleton"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
        await _rate_limiter.init()
    return _rate_limiter


def rate_limit(
    endpoint_type: str = "default",
    custom_limit: Optional[int] = None,
    custom_window: Optional[int] = None
):
    """
    Rate limiting decorator for endpoints.

    Usage:
        @router.post("/tts")
        @rate_limit("tts")
        async def text_to_speech(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, request: Request = None, **kwargs):
            # Get request from args if not in kwargs
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request is None:
                return await func(*args, **kwargs)

            # Get user info from request state
            user = getattr(request.state, "user", None)

            if user:
                identifier = user.get("user_id", user.get("api_key", ""))
                plan = user.get("plan", "free")
            else:
                # Use IP for unauthenticated requests
                identifier = request.client.host
                plan = "free"

            # Get rate limit config
            if custom_limit and custom_window:
                limit_config = {"limit": custom_limit, "window": custom_window}
            else:
                limit_config = get_rate_limit(plan, endpoint_type)

            # Check rate limit
            limiter = await get_rate_limiter()
            allowed, info = await limiter.is_allowed(
                identifier=identifier,
                limit=limit_config["limit"],
                window_seconds=limit_config["window"],
                endpoint=request.url.path
            )

            # Add rate limit headers
            request.state.rate_limit_info = info

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info["limit"],
                        "reset": info["reset"],
                        "retry_after": info["window_seconds"]
                    },
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(info["reset"]),
                        "Retry-After": str(info["window_seconds"])
                    }
                )

            return await func(*args, request=request, **kwargs)

        return wrapper
    return decorator


class RateLimitMiddleware:
    """
    FastAPI middleware for global rate limiting.
    Applied to all requests.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip rate limiting for certain paths
        skip_paths = ["/health", "/docs", "/openapi.json", "/static"]
        if any(request.url.path.startswith(p) for p in skip_paths):
            await self.app(scope, receive, send)
            return

        # Get identifier
        user = getattr(request.state, "user", None) if hasattr(request, "state") else None

        if user:
            identifier = user.get("user_id", "")
            plan = user.get("plan", "free")
        else:
            identifier = request.client.host if request.client else "unknown"
            plan = "free"

        # Apply global rate limit
        limiter = await get_rate_limiter()
        limit_config = get_rate_limit(plan, "default")

        allowed, info = await limiter.is_allowed(
            identifier=identifier,
            limit=limit_config["limit"],
            window_seconds=limit_config["window"]
        )

        if not allowed:
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after": info["window_seconds"]
                },
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(info["reset"]),
                    "Retry-After": str(info["window_seconds"])
                }
            )
            await response(scope, receive, send)
            return

        # Add rate limit headers to response
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-ratelimit-limit", str(info["limit"]).encode()),
                    (b"x-ratelimit-remaining", str(info["remaining"]).encode()),
                    (b"x-ratelimit-reset", str(info["reset"]).encode()),
                ])
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
