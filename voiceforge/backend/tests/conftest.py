"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock, AsyncMock
import tempfile
import os

from fastapi.testclient import TestClient
from httpx import AsyncClient
import fakeredis.aioredis

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["STORAGE_TYPE"] = "local"
os.environ["STORAGE_PATH"] = tempfile.mkdtemp()


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def app():
    """Get FastAPI application"""
    from app.main import app
    return app


@pytest.fixture
def client(app) -> Generator:
    """Sync test client"""
    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_client(app) -> AsyncGenerator:
    """Async test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    return fakeredis.aioredis.FakeRedis()


@pytest.fixture
def auth_headers():
    """Get authentication headers for testing"""
    from app.core.security import create_access_token

    token = create_access_token(subject="test-user-id")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def api_key_headers():
    """Get API key headers for testing"""
    return {"X-API-Key": "vf_test_api_key_for_testing"}


@pytest.fixture
def sample_audio_bytes():
    """Generate sample audio bytes for testing"""
    import numpy as np
    import io
    from scipy.io import wavfile

    # Generate 1 second of silence
    sample_rate = 22050
    duration = 1.0
    samples = np.zeros(int(sample_rate * duration), dtype=np.int16)

    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, samples)
    buffer.seek(0)
    return buffer.read()


@pytest.fixture
def sample_text():
    """Sample text for TTS testing"""
    return "Hello, this is a test of the text to speech system."


@pytest.fixture
def mock_tts_service():
    """Mock TTS service"""
    mock = MagicMock()
    mock.initialize = AsyncMock()
    mock.synthesize = AsyncMock(return_value={
        "audio": b"fake_audio_data",
        "duration_seconds": 2.5,
        "sample_rate": 22050
    })
    mock.get_voices = AsyncMock(return_value=[
        {"id": "voice1", "name": "Test Voice 1"},
        {"id": "voice2", "name": "Test Voice 2"},
    ])
    return mock


@pytest.fixture
def mock_stt_service():
    """Mock STT service"""
    mock = MagicMock()
    mock.initialize = AsyncMock()
    mock.transcribe = AsyncMock(return_value={
        "text": "This is a test transcription.",
        "language": "en",
        "duration_seconds": 5.0,
        "segments": [
            {"start": 0.0, "end": 2.5, "text": "This is a test"},
            {"start": 2.5, "end": 5.0, "text": "transcription."},
        ]
    })
    return mock


@pytest.fixture
def mock_storage_service():
    """Mock storage service"""
    mock = MagicMock()
    mock.upload = AsyncMock(return_value="https://storage.example.com/test.mp3")
    mock.download = AsyncMock(return_value=b"fake_audio_data")
    mock.delete = AsyncMock(return_value=True)
    mock.get_signed_url = AsyncMock(return_value="https://storage.example.com/signed/test.mp3")
    return mock


@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "plan": "pro",
        "credits_remaining": 100000,
        "is_active": True
    }


@pytest.fixture
def test_voice():
    """Test voice data"""
    return {
        "id": "test-voice-id",
        "name": "Test Voice",
        "category": "cloned",
        "language": "en",
        "is_public": False
    }


# Cleanup after tests
@pytest.fixture(autouse=True)
def cleanup():
    """Cleanup after each test"""
    yield
    # Clean up any test files
    import shutil
    storage_path = os.environ.get("STORAGE_PATH")
    if storage_path and os.path.exists(storage_path):
        shutil.rmtree(storage_path, ignore_errors=True)
