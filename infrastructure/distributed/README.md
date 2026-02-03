# Unified AI Platform: 11labs + Krya

A distributed deployment architecture for running 11labs (Voice AI) and Krya (Image/Video AI) together, sharing infrastructure and GPU resources.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LINUX VM                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     Docker Compose Stack                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │ PostgreSQL  │  │    Redis    │  │    MinIO    │  │    Nginx    │    ││
│  │  │  (Shared)   │  │  (Shared)   │  │  (Storage)  │  │   (Proxy)   │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  │                                                                          ││
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐       ││
│  │  │      11labs             │  │         Krya                │       ││
│  │  │  ┌─────────┐ ┌─────────┐   │  │  ┌─────────────────────┐   │       ││
│  │  │  │ FastAPI │ │ Next.js │   │  │  │      Next.js        │   │       ││
│  │  │  │  :8000  │ │  :3000  │   │  │  │       :3001         │   │       ││
│  │  │  └─────────┘ └─────────┘   │  │  └─────────────────────┘   │       ││
│  │  │  ┌─────────────────────┐   │  │                             │       ││
│  │  │  │   Celery Workers    │   │  │  Uses remote GPU for AI    │       ││
│  │  │  │   (CPU tasks)       │   │  │                             │       ││
│  │  │  └─────────────────────┘   │  └─────────────────────────────┘       ││
│  │  └─────────────────────────────┘                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                              Network (LAN)
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WINDOWS PC (RTX 5090)                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        GPU Services                                      ││
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ ││
│  │  │  11labs Worker  │  │      ComfyUI        │  │     Ollama      │ ││
│  │  │      :8001          │  │       :8188         │  │     :11434      │ ││
│  │  │                     │  │                     │  │                 │ ││
│  │  │  - TTS (XTTS v2)    │  │  - Stable Diffusion │  │  - LLaMA 3.1    │ ││
│  │  │  - STT (Whisper)    │  │  - ControlNet       │  │  - Mistral      │ ││
│  │  │  - SFX (AudioLDM)   │  │  - LoRA Training    │  │  - Code Models  │ ││
│  │  │  - Isolation        │  │  - Video Gen        │  │                 │ ││
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Shared Infrastructure (Linux VM)

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database for both 11labs and Krya |
| Redis | 6379 | Caching, job queues, sessions |
| MinIO | 9000/9001 | S3-compatible object storage |
| Nginx | 80/443 | Reverse proxy, SSL termination |

### 11labs (Voice AI)

| Component | Port | Purpose |
|-----------|------|---------|
| FastAPI Backend | 8000 | REST API for voice services |
| Next.js Frontend | 3000 | Web UI |
| Celery Workers | - | Background task processing |

**Features:**
- Text-to-Speech (XTTS v2 - multilingual, voice cloning)
- Speech-to-Text (Whisper large-v3)
- Sound Effects Generation (AudioLDM2)
- Voice Isolation (Demucs)
- Voice Cloning
- AI Dubbing

### Krya (Image/Video AI)

| Component | Port | Purpose |
|-----------|------|---------|
| Next.js App | 3001 | Full-stack web application |

**Features:**
- Text-to-Image (Stable Diffusion via ComfyUI)
- Image Enhancement
- LoRA Training
- Video Generation
- Style Transfer

### GPU Services (Windows PC)

| Service | Port | Purpose |
|---------|------|---------|
| 11labs Worker | 8001 | Voice AI processing |
| ComfyUI | 8188 | Image/Video generation |
| Ollama | 11434 | Local LLM inference |

## Quick Start

### 1. Linux VM Setup

```bash
# Clone the repository
git clone <repository-url>
cd Registration-1/infrastructure/distributed

# Run setup script
chmod +x setup-linux.sh
./setup-linux.sh

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start infrastructure
docker compose -f docker-compose.unified.yml up -d postgres redis minio
```

### 2. Windows PC Setup

```powershell
# Open PowerShell as Administrator
cd Registration-1\infrastructure\distributed

# Run setup script
.\setup-windows.ps1

# Start GPU services
cd gpu-worker
.\start_all_gpu_services.ps1
```

### 3. Start Applications

```bash
# On Linux VM
docker compose -f docker-compose.unified.yml up -d elevenlabs-api elevenlabs-frontend

# Access applications:
# 11labs: http://localhost:3000
# MinIO Console: http://localhost:9001
```

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```env
# Network
HOST_IP=192.168.1.100          # Linux VM IP
WINDOWS_GPU_HOST=192.168.1.200 # Windows PC IP

# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=secure-password

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure-password

# Secrets
ELEVENLABS_SECRET_KEY=your-secret-key
KRYA_NEXTAUTH_SECRET=your-nextauth-secret
```

### GPU Worker Configuration

The 11labs backend can run in two modes:

1. **Local Mode** (default): AI models run on the same machine
   ```env
   GPU_WORKER_MODE=local
   DEVICE=cuda
   ```

2. **Remote Mode**: AI processing happens on Windows PC
   ```env
   GPU_WORKER_MODE=remote
   GPU_WORKER_URL=http://192.168.1.200:8001
   DEVICE=cpu
   ```

## Network Requirements

Ensure these ports are accessible between machines:

| From | To | Port | Purpose |
|------|-----|------|---------|
| Linux VM | Windows PC | 8001 | 11labs GPU Worker |
| Linux VM | Windows PC | 8188 | ComfyUI API |
| Linux VM | Windows PC | 11434 | Ollama API |

### Windows Firewall

The setup script automatically creates firewall rules. To do manually:

```powershell
New-NetFirewallRule -DisplayName "11labs GPU" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
New-NetFirewallRule -DisplayName "ComfyUI" -Direction Inbound -Protocol TCP -LocalPort 8188 -Action Allow
New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow
```

## Storage Buckets

MinIO automatically creates these buckets:

| Bucket | Purpose |
|--------|---------|
| elevenlabs-audio | Generated audio files |
| elevenlabs-models | Voice models and references |
| krya-images | Generated images |
| krya-videos | Generated videos |
| krya-models | LoRA and other models |

## Resource Requirements

### Linux VM (Minimum)
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD

### Windows PC (Recommended)
- GPU: NVIDIA RTX 5090 (or RTX 40xx series)
- VRAM: 24GB+ recommended
- RAM: 32GB+
- Storage: 500GB SSD (for models)

## Model Storage

Models are downloaded automatically on first use:

| Model | Size | Purpose |
|-------|------|---------|
| XTTS v2 | ~2GB | Text-to-Speech |
| Whisper large-v3 | ~3GB | Speech-to-Text |
| AudioLDM2 | ~5GB | Sound Effects |
| Demucs | ~1GB | Voice Isolation |
| SDXL | ~6GB | Image Generation |
| LLaMA 3.1 8B | ~5GB | LLM |

## Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:8000/health          # 11labs API
curl http://192.168.1.200:8001/health      # GPU Worker
curl http://192.168.1.200:8188/system_stats # ComfyUI
curl http://192.168.1.200:11434/api/tags    # Ollama
```

### View Logs

```bash
# All services
docker compose -f docker-compose.unified.yml logs -f

# Specific service
docker compose -f docker-compose.unified.yml logs -f elevenlabs-api
```

## Troubleshooting

### GPU Worker Not Connecting

1. Check Windows firewall rules
2. Verify IP addresses in `.env`
3. Ensure GPU worker is running: `http://<windows-ip>:8001/health`

### Out of VRAM

1. Reduce batch sizes
2. Use smaller models (e.g., Whisper medium instead of large)
3. Enable model offloading in ComfyUI

### Database Connection Issues

1. Check PostgreSQL is running: `docker compose ps postgres`
2. Verify DATABASE_URL in environment
3. Check network connectivity

## Security Notes

For personal/self-hosted use:

1. Change all default passwords
2. Use strong secrets for JWT tokens
3. Consider VPN for remote access
4. Don't expose ports to public internet

## File Structure

```
infrastructure/distributed/
├── docker-compose.unified.yml    # Main compose file
├── .env.example                  # Environment template
├── setup-linux.sh               # Linux setup script
├── setup-windows.ps1            # Windows setup script
├── init-scripts/
│   └── create-databases.sh      # PostgreSQL init
├── nginx/
│   └── nginx.conf               # Reverse proxy config
└── gpu-worker/
    ├── voice_worker.py          # Voice AI service
    ├── requirements.txt         # Python dependencies
    ├── start_worker.bat         # Windows batch starter
    └── start_all_gpu_services.ps1  # All services launcher
```

## License

For personal use only. See individual project licenses for components.
