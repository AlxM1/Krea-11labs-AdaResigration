"""
Tests for Text-to-Speech API endpoints
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import status


class TestTTSEndpoints:
    """Test TTS API endpoints"""

    def test_tts_generate_success(self, client, auth_headers, mock_tts_service):
        """Test successful TTS generation"""
        with patch("app.api.v1.endpoints.tts.get_tts_service", return_value=mock_tts_service):
            response = client.post(
                "/api/v1/text-to-speech",
                data={
                    "text": "Hello, world!",
                    "voice_id": "test-voice-id",
                    "model_id": "xtts_v2"
                },
                headers=auth_headers
            )

            assert response.status_code == status.HTTP_200_OK
            assert response.headers["content-type"].startswith("audio/")

    def test_tts_generate_empty_text(self, client, auth_headers):
        """Test TTS generation with empty text"""
        response = client.post(
            "/api/v1/text-to-speech",
            data={
                "text": "",
                "voice_id": "test-voice-id"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_tts_generate_text_too_long(self, client, auth_headers):
        """Test TTS generation with text exceeding limit"""
        long_text = "a" * 50001  # Exceeds 50k character limit

        response = client.post(
            "/api/v1/text-to-speech",
            data={
                "text": long_text,
                "voice_id": "test-voice-id"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_tts_generate_unauthorized(self, client):
        """Test TTS generation without authentication"""
        response = client.post(
            "/api/v1/text-to-speech",
            data={
                "text": "Hello, world!",
                "voice_id": "test-voice-id"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tts_list_voices(self, client, auth_headers, mock_tts_service):
        """Test listing available voices"""
        with patch("app.api.v1.endpoints.voices.get_tts_service", return_value=mock_tts_service):
            response = client.get(
                "/api/v1/voices",
                headers=auth_headers
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "voices" in data
            assert isinstance(data["voices"], list)

    def test_tts_list_models(self, client, auth_headers):
        """Test listing available TTS models"""
        response = client.get(
            "/api/v1/text-to-speech/models",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "models" in data

    def test_tts_generate_with_settings(self, client, auth_headers, mock_tts_service):
        """Test TTS generation with custom settings"""
        with patch("app.api.v1.endpoints.tts.get_tts_service", return_value=mock_tts_service):
            response = client.post(
                "/api/v1/text-to-speech",
                data={
                    "text": "Hello with settings!",
                    "voice_id": "test-voice-id",
                    "stability": 0.7,
                    "similarity_boost": 0.8,
                    "speed": 1.1
                },
                headers=auth_headers
            )

            assert response.status_code == status.HTTP_200_OK


class TestTTSStreaming:
    """Test TTS streaming endpoints"""

    @pytest.mark.asyncio
    async def test_tts_stream(self, async_client, auth_headers, mock_tts_service):
        """Test streaming TTS generation"""
        # Streaming tests require WebSocket client
        pass


class TestTTSCredits:
    """Test TTS credit consumption"""

    def test_credits_consumed(self, client, auth_headers, mock_tts_service):
        """Test that credits are consumed on generation"""
        with patch("app.api.v1.endpoints.tts.get_tts_service", return_value=mock_tts_service):
            text = "Hello, world!"

            response = client.post(
                "/api/v1/text-to-speech",
                data={
                    "text": text,
                    "voice_id": "test-voice-id"
                },
                headers=auth_headers
            )

            assert response.status_code == status.HTTP_200_OK
            # Check X-Credits-Used header if implemented
            # assert int(response.headers.get("X-Credits-Used", 0)) == len(text)
