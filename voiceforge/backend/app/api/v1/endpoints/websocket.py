"""
WebSocket endpoints for real-time streaming
"""
import asyncio
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from starlette.websockets import WebSocketState
import uuid

from app.core.security import decode_token
from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for streaming audio.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, list] = {}

    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        user_id: Optional[str] = None
    ):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(connection_id)

        logger.info(f"WebSocket connected: {connection_id}")

    def disconnect(self, connection_id: str, user_id: Optional[str] = None):
        """Remove a WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        if user_id and user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_json(self, connection_id: str, data: dict):
        """Send JSON data to a specific connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(data)

    async def send_bytes(self, connection_id: str, data: bytes):
        """Send binary data to a specific connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_bytes(data)

    async def broadcast_to_user(self, user_id: str, data: dict):
        """Broadcast to all connections for a user"""
        if user_id in self.user_connections:
            for conn_id in self.user_connections[user_id]:
                await self.send_json(conn_id, data)


# Global connection manager
manager = ConnectionManager()


async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
) -> Optional[dict]:
    """Authenticate WebSocket connection"""
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return None

    try:
        payload = decode_token(token)
        return {"user_id": payload.get("sub")}
    except Exception:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return None


@router.websocket("/ws/tts")
async def websocket_tts(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    voice_id: str = Query(...),
    model_id: str = Query("xtts_v2")
):
    """
    WebSocket endpoint for streaming TTS.

    Client sends:
    - {"type": "text", "data": "Text to synthesize"}
    - {"type": "end"} to signal end of input

    Server sends:
    - {"type": "audio", "data": "<base64 audio chunk>"}
    - {"type": "done"} when complete
    - {"type": "error", "message": "..."} on error
    """
    # Authenticate
    user = await authenticate_websocket(websocket, token)
    if not user:
        return

    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, connection_id, user["user_id"])

    try:
        from app.services.tts.tts_service import get_tts_service
        import base64

        tts_service = get_tts_service()
        await tts_service.initialize()

        while True:
            # Receive message
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "text":
                text = data.get("data", "")

                if not text:
                    await manager.send_json(connection_id, {
                        "type": "error",
                        "message": "Empty text"
                    })
                    continue

                try:
                    # Stream audio chunks
                    async for chunk in tts_service.synthesize_streaming(
                        text=text,
                        voice_id=voice_id,
                        model_id=model_id
                    ):
                        # Send audio chunk as base64
                        await manager.send_json(connection_id, {
                            "type": "audio",
                            "data": base64.b64encode(chunk).decode()
                        })

                    # Signal completion
                    await manager.send_json(connection_id, {"type": "done"})

                except Exception as e:
                    logger.error(f"TTS streaming error: {e}")
                    await manager.send_json(connection_id, {
                        "type": "error",
                        "message": str(e)
                    })

            elif msg_type == "end":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(connection_id, user.get("user_id"))


@router.websocket("/ws/stt")
async def websocket_stt(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    model_id: str = Query("whisper")
):
    """
    WebSocket endpoint for real-time STT.

    Client sends:
    - Binary audio chunks (PCM 16-bit, 16kHz)
    - {"type": "end"} to signal end of audio

    Server sends:
    - {"type": "partial", "text": "..."} for interim results
    - {"type": "final", "text": "...", "segments": [...]} for final result
    - {"type": "error", "message": "..."} on error
    """
    # Authenticate
    user = await authenticate_websocket(websocket, token)
    if not user:
        return

    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, connection_id, user["user_id"])

    try:
        from app.services.stt.stt_service import get_stt_service
        import io

        stt_service = get_stt_service()
        await stt_service.initialize()

        audio_buffer = io.BytesIO()
        chunk_count = 0

        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    # Audio chunk received
                    audio_chunk = message["bytes"]
                    audio_buffer.write(audio_chunk)
                    chunk_count += 1

                    # Process every N chunks for interim results
                    if chunk_count % 10 == 0:
                        audio_buffer.seek(0)
                        audio_data = audio_buffer.read()
                        audio_buffer.seek(0, 2)  # Seek to end

                        try:
                            result = await stt_service.transcribe_realtime(
                                audio_chunk=audio_data,
                                language=language
                            )

                            await manager.send_json(connection_id, {
                                "type": "partial",
                                "text": result["text"]
                            })

                        except Exception as e:
                            logger.warning(f"Interim transcription error: {e}")

                elif "text" in message:
                    data = json.loads(message["text"])
                    if data.get("type") == "end":
                        # Final transcription
                        audio_buffer.seek(0)
                        audio_data = audio_buffer.read()

                        if audio_data:
                            result = await stt_service.transcribe(
                                audio_data=audio_data,
                                language=language,
                                timestamps="word"
                            )

                            await manager.send_json(connection_id, {
                                "type": "final",
                                "text": result["text"],
                                "language": result["language"],
                                "duration_seconds": result["duration_seconds"],
                                "segments": result.get("segments", []),
                                "words": result.get("words")
                            })
                        break

            elif message["type"] == "websocket.disconnect":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket STT error: {e}")
        await manager.send_json(connection_id, {
            "type": "error",
            "message": str(e)
        })
    finally:
        manager.disconnect(connection_id, user.get("user_id"))


@router.websocket("/ws/conversation")
async def websocket_conversation(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    voice_id: str = Query(...),
    system_prompt: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for conversational AI with voice.

    Combines STT -> LLM -> TTS for real-time voice conversations.

    Client sends:
    - Binary audio chunks (user speaking)
    - {"type": "text", "data": "..."} for text input
    - {"type": "end_turn"} to signal end of user turn

    Server sends:
    - {"type": "transcription", "text": "..."} user speech transcription
    - {"type": "response", "text": "..."} AI response text
    - {"type": "audio", "data": "<base64>"} AI response audio
    - {"type": "turn_complete"} when AI finishes responding
    """
    # Authenticate
    user = await authenticate_websocket(websocket, token)
    if not user:
        return

    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, connection_id, user["user_id"])

    try:
        from app.services.tts.tts_service import get_tts_service
        from app.services.stt.stt_service import get_stt_service
        import base64
        import io

        tts_service = get_tts_service()
        stt_service = get_stt_service()

        await tts_service.initialize()
        await stt_service.initialize()

        # Conversation history
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        audio_buffer = io.BytesIO()

        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    # Audio input
                    audio_buffer.write(message["bytes"])

                elif "text" in message:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "text":
                        # Direct text input
                        user_text = data.get("data", "")
                        if user_text:
                            messages.append({"role": "user", "content": user_text})
                            await manager.send_json(connection_id, {
                                "type": "transcription",
                                "text": user_text
                            })

                    elif msg_type == "end_turn":
                        # Process user turn
                        audio_buffer.seek(0)
                        audio_data = audio_buffer.read()
                        audio_buffer = io.BytesIO()  # Reset buffer

                        # Transcribe if there's audio
                        if audio_data:
                            result = await stt_service.transcribe(audio_data)
                            user_text = result["text"]

                            if user_text:
                                messages.append({"role": "user", "content": user_text})
                                await manager.send_json(connection_id, {
                                    "type": "transcription",
                                    "text": user_text
                                })

                        # Generate AI response (placeholder - integrate with LLM)
                        ai_response = await generate_ai_response(messages)
                        messages.append({"role": "assistant", "content": ai_response})

                        await manager.send_json(connection_id, {
                            "type": "response",
                            "text": ai_response
                        })

                        # Generate speech for response
                        async for chunk in tts_service.synthesize_streaming(
                            text=ai_response,
                            voice_id=voice_id
                        ):
                            await manager.send_json(connection_id, {
                                "type": "audio",
                                "data": base64.b64encode(chunk).decode()
                            })

                        await manager.send_json(connection_id, {
                            "type": "turn_complete"
                        })

                    elif msg_type == "end":
                        break

            elif message["type"] == "websocket.disconnect":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Conversation WebSocket error: {e}")
    finally:
        manager.disconnect(connection_id, user.get("user_id"))


async def generate_ai_response(messages: list) -> str:
    """
    Generate AI response using LLM.
    Replace with actual LLM integration (OpenAI, Anthropic, etc.)
    """
    # Placeholder - integrate with your preferred LLM
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            max_tokens=500
        )

        return response.choices[0].message.content

    except Exception as e:
        logger.error(f"LLM error: {e}")
        return "I'm sorry, I couldn't process that request. Please try again."
