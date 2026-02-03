# VoiceForge - AI Voice Platform

An open-source alternative to ElevenLabs with text-to-speech, voice cloning, speech-to-text, sound effects generation, and voice isolation capabilities.

## Features

- **Text-to-Speech (TTS)**: Convert text to natural-sounding speech with XTTS v2
  - 32+ language support
  - Adjustable voice settings (stability, similarity, speed)
  - Multiple output formats (MP3, WAV, FLAC, OGG, PCM)
  - Streaming support for real-time applications

- **Voice Cloning**: Create custom AI voices from audio samples
  - Instant cloning from 5-60 seconds of audio
  - Professional cloning for higher quality (30+ minutes)
  - Preserve voice characteristics across languages

- **Speech-to-Text (STT)**: Transcribe audio with Whisper
  - 99+ language support
  - Speaker diarization
  - Word-level timestamps
  - Entity detection (PII, PHI)
  - Export to TXT, SRT, VTT, JSON

- **Sound Effects Generation**: Create any sound from text descriptions
  - Text-to-SFX with AudioLDM
  - Up to 30 seconds duration
  - Looping audio support
  - Royalty-free output

- **Voice Isolation**: Separate vocals from background audio
  - Powered by Demucs
  - Extract vocals from music
  - Remove background noise
  - Audio enhancement

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **XTTS v2 (Coqui TTS)** - Text-to-speech
- **Whisper** - Speech-to-text
- **AudioLDM** - Sound effects generation
- **Demucs** - Voice isolation
- **PostgreSQL** - Database
- **Redis** - Caching and queues
- **Celery** - Background tasks

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **Radix UI** - UI components
- **Zustand** - State management

## Quick Start

### Prerequisites
- Docker & Docker Compose
- NVIDIA GPU with CUDA (recommended)
- 16GB+ RAM
- 50GB+ disk space (for AI models)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voiceforge.git
cd voiceforge
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Start with Docker Compose:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Development Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Reference

### Text-to-Speech
```bash
curl -X POST "http://localhost:8000/api/v1/text-to-speech/rachel/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, welcome to VoiceForge!",
    "model_id": "eleven_multilingual_v2",
    "output_format": "mp3"
  }' \
  --output speech.mp3
```

### Voice Cloning
```bash
curl -X POST "http://localhost:8000/api/v1/voices/add" \
  -F "name=My Voice" \
  -F "files=@voice_sample.mp3"
```

### Speech-to-Text
```bash
curl -X POST "http://localhost:8000/api/v1/speech-to-text" \
  -F "file=@audio.mp3" \
  -F "language=en"
```

### Sound Effects
```bash
curl -X POST "http://localhost:8000/api/v1/sound-generation/stream" \
  -F "prompt=rain falling on a window" \
  -F "duration_seconds=10" \
  --output rain.mp3
```

### Voice Isolation
```bash
curl -X POST "http://localhost:8000/api/v1/audio-isolation/stream" \
  -F "file=@song.mp3" \
  -F "component=vocals" \
  --output vocals.mp3
```

## Project Structure

```
voiceforge/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API routes
│   │   ├── core/                # Configuration & security
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # AI services
│   │   │   ├── tts/             # Text-to-speech
│   │   │   ├── stt/             # Speech-to-text
│   │   │   ├── voice_cloning/   # Voice cloning
│   │   │   ├── sound_effects/   # SFX generation
│   │   │   └── voice_isolation/ # Voice separation
│   │   └── main.py              # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js pages
│   ├── components/              # React components
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `false` |
| `SECRET_KEY` | JWT secret key | Required |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | Required |
| `DEVICE` | AI device (`cuda`/`cpu`) | `cuda` |
| `TTS_MODEL` | TTS model name | `xtts_v2` |
| `WHISPER_MODEL` | Whisper model size | `large-v3` |

## Hardware Requirements

### Minimum (CPU only)
- 8GB RAM
- 4 CPU cores
- 20GB disk

### Recommended (with GPU)
- 16GB RAM
- NVIDIA GPU with 8GB+ VRAM
- 50GB disk (for model caching)

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Coqui TTS](https://github.com/coqui-ai/TTS) - XTTS v2 model
- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [AudioLDM](https://github.com/haoheliu/AudioLDM) - Sound generation
- [Demucs](https://github.com/facebookresearch/demucs) - Voice separation
