# Krya - Complete Krea AI Clone Implementation Plan

## Executive Summary

**Krya** is a 100% clone of [Krea AI](https://www.krea.ai/), an AI-powered creative platform that offers real-time image generation, video creation, image enhancement, 3D generation, and workflow automation. This document provides a comprehensive implementation plan based on deep research of Krea AI's features, UI/UX, and technical architecture.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Core Features](#2-core-features)
3. [Technical Architecture](#3-technical-architecture)
4. [UI/UX Components](#4-uiux-components)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [AI Model Integration](#7-ai-model-integration)
8. [Implementation Phases](#8-implementation-phases)
9. [Infrastructure Requirements](#9-infrastructure-requirements)
10. [Third-Party Integrations](#10-third-party-integrations)

---

## 1. Platform Overview

### 1.1 What is Krya?

Krya is a comprehensive AI creative platform that enables users to:
- Generate images in real-time with instant visual feedback
- Create and edit videos using multiple AI models
- Enhance and upscale images up to 22K resolution
- Generate 3D objects from text or images
- Train custom AI models (LoRA)
- Build automated workflows with a visual node editor

### 1.2 Target Platforms

| Platform | Technology | Priority |
|----------|------------|----------|
| Web Application | Next.js + React | P0 (Core) |
| Desktop App | Electron | P1 |
| iOS App | React Native / Swift | P2 |
| Android App | React Native | P2 |
| API | REST + WebSocket | P0 (Core) |

---

## 2. Core Features

### 2.1 Image Generation

#### 2.1.1 Text-to-Image Generation

**Capabilities:**
- Multiple model support (64+ models in Krea)
- Batch generation (up to 4 images simultaneously)
- Multi-language prompting
- Style reference system
- Resolution options: 512x512 to 4K (16MP)
- 6-second generation time target

**Models to Integrate:**
| Model | Source | Use Case |
|-------|--------|----------|
| SDXL Lightning | ByteDance | Fast 4-step generation |
| Flux.1 Dev | Black Forest Labs | High quality |
| Flux Schnell | Black Forest Labs | Speed-optimized |
| Stable Diffusion 3 | Stability AI | Quality baseline |
| Ideogram | Ideogram | Text rendering |
| DALL-E 3 | OpenAI | Premium option |

**UI Components:**
- Prompt input with multi-line support
- Negative prompt field
- Model selector dropdown
- Aspect ratio presets (1:1, 16:9, 9:16, 4:3, 3:4)
- Style preset gallery (1000+ styles)
- Generation settings panel (steps, CFG, seed)
- Batch size selector (1-4)
- Reference image upload

#### 2.1.2 Image-to-Image Generation

**Capabilities:**
- Upload reference image
- Adjustable strength/denoising
- Style transfer
- Variation generation

---

### 2.2 Real-Time Generation (Killer Feature)

**The signature feature of Krea - instant AI rendering as you draw/type.**

#### 2.2.1 Technical Implementation

**Architecture:**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Canvas Input   │────▶│  WebSocket API   │────▶│  LCM Pipeline   │
│  (Drawing/Text) │     │  (< 50ms latency)│     │  (2-4 steps)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│  Canvas Output  │◀────│  MsgPack Frames  │◀─────────────┘
│  (AI Render)    │     │  (Binary Stream) │
└─────────────────┘     └──────────────────┘
```

**Key Technologies:**
- **Latent Consistency Models (LCM)**: Reduces diffusion from 50 steps to 2-4 steps
- **StreamDiffusion**: Pipeline for real-time processing
- **WebSocket + MsgPack**: Efficient binary frame streaming
- **Canvas API**: HTML5 canvas for drawing and display

**Performance Targets:**
- < 50ms generation latency
- 10-15 fps continuous rendering
- Support for 512x512 to 1024x1024 real-time output

#### 2.2.2 Input Sources

| Source | Implementation |
|--------|----------------|
| Text Prompt | Real-time as-you-type updates |
| Canvas Drawing | Freeform brush strokes |
| Geometric Shapes | Rectangle, circle, line tools |
| Image Upload | Drag-and-drop with layering |
| Webcam | MediaDevices API stream |
| Screen Capture | Screen Capture API |

#### 2.2.3 Canvas Tools

**Drawing Tools:**
- Brush (variable size, color, opacity)
- Eraser
- Shape tools (rectangle, circle, line, polygon)
- Selection tool (move, resize, rotate)
- Color picker / eyedropper
- Fill bucket

**Layer Management:**
- Add/remove layers
- Layer visibility toggle
- Layer opacity
- Layer blending modes
- Layer reordering (drag-and-drop)
- Background removal (AI-powered)

**Controls:**
- AI Strength slider (0-100%)
- Seed control (random/fixed)
- Model selector
- Resolution selector
- Clear canvas
- Undo/Redo stack

---

### 2.3 Video Generation

#### 2.3.1 Supported Models

| Model | Provider | Best For | Resolution | Duration |
|-------|----------|----------|------------|----------|
| Kling 2.5 | Kuaishou | Motion, sports | 720p | 5-10s |
| Runway Gen-4 | Runway | Character consistency | 720p | 4-16s |
| Luma Ray 2 | Luma Labs | Cinematic | 720p | 5s |
| Hunyuan | Tencent | General purpose | 720p | 5s |
| Wan 2.5 | Open source | Speed/cost | 480-720p | 5s |
| Veo 3 | Google | Quality + audio | 720p | 8s |

#### 2.3.2 Generation Modes

**Text-to-Video:**
- Prompt input
- Duration selection
- Aspect ratio (16:9, 9:16, 1:1)
- Model selection

**Image-to-Video:**
- First frame upload
- Optional last frame
- Motion intensity control
- Camera movement presets

**Video Extension:**
- Extend existing video
- Seamless continuation
- Direction control (forward/backward)

#### 2.3.3 Video Tools

**Lipsync:**
- Upload video + audio
- AI lip synchronization
- Multiple language support
- Face detection and tracking

**Motion Transfer:**
- Source video for motion
- Target image to animate
- Pose extraction
- Real-time preview

**Video Restyle:**
- Input video
- Style prompt or reference image
- Temporal consistency
- Strength control

**Video Upscaling:**
- Up to 8K output
- Frame interpolation (24→60→120 fps)
- Restoration for old footage
- Denoising and sharpening

---

### 2.4 Image Enhancement/Upscaling

#### 2.4.1 Capabilities

| Feature | Specification |
|---------|---------------|
| Max Resolution | 22K (22,000 pixels longest side) |
| Scale Factors | 1x, 2x, 4x, 8x |
| Enhancement Types | Detail generation, sharpening, denoising |
| Models | Real-ESRGAN, GFPGAN (faces), CodeFormer |

#### 2.4.2 Enhancement Models

| Model | Use Case |
|-------|----------|
| Krya Enhance | General purpose (generative) |
| Real-ESRGAN | Photo upscaling |
| GFPGAN | Face restoration |
| CodeFormer | Face enhancement |
| Topaz-style | Neutral upscaling |

#### 2.4.3 UI Flow

1. Upload image (drag-drop or file picker)
2. Select scale factor
3. Choose enhancement model
4. Preview before/after comparison
5. Download enhanced image

---

### 2.5 Image Editing

#### 2.5.1 Editing Capabilities

| Feature | Description |
|---------|-------------|
| Inpainting | Select area → describe replacement |
| Outpainting | Extend image beyond borders |
| Object Removal | Select → remove seamlessly |
| Background Replace | Detect subject → new background |
| Style Transfer | Apply artistic style |
| Instruction Editing | Natural language edits |

#### 2.5.2 Models for Editing

- Flux Kontext (instruction-based)
- SDXL Inpainting
- Stable Diffusion Inpainting
- Segment Anything (SAM) for masks

---

### 2.6 3D Object Generation

#### 2.6.1 Capabilities

| Feature | Models |
|---------|--------|
| Text-to-3D | Shap-E, Point-E |
| Image-to-3D | TripoSR, Trellis |
| Output Formats | GLB, OBJ, FBX |
| Texturing | Auto-textured meshes |

#### 2.6.2 3D Viewer

- WebGL-based viewer (Three.js)
- Rotate, zoom, pan controls
- Environment lighting presets
- Material preview
- Download in multiple formats

---

### 2.7 Custom Model Training (LoRA)

#### 2.7.1 Training Types

| Type | Use Case | Images Needed |
|------|----------|---------------|
| Face/Person | Consistent character | 10-50 photos |
| Product | Product photography | 10-30 photos |
| Style | Artistic style | 20-50 images |
| Object | Specific object | 10-30 photos |

#### 2.7.2 Training Pipeline

1. Upload images (up to 50)
2. Auto-captioning (BLIP-2 / LLaVA)
3. Auto-segmentation (SAM)
4. Face masking (for person training)
5. Training (LoRA fine-tuning)
6. Model saved to user library

#### 2.7.3 Technical Implementation

- Base: Stable Diffusion / Flux
- Method: LoRA (Low-Rank Adaptation)
- Training: 1000-5000 steps
- Hardware: A100/H100 GPU

---

### 2.8 Nodes (Workflow Automation)

#### 2.8.1 Node Types

**Input Nodes:**
- Text Prompt
- Image Upload
- Video Upload
- Parameter Inputs

**Processing Nodes:**
- Image Generation
- Video Generation
- Upscaling
- Style Transfer
- Face Detection
- Background Removal

**Output Nodes:**
- Image Output
- Video Output
- File Download
- API Webhook

**Logic Nodes:**
- Conditional Branch
- Loop
- Merge
- Split

#### 2.8.2 Node Editor UI

- Infinite canvas (pan/zoom)
- Drag-and-drop node placement
- Connection wires between nodes
- Parameter panels per node
- Real-time preview
- Save/load workflows
- Share as mini-app

---

## 3. Technical Architecture

### 3.1 System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │   Next.js    │  │    Svelte    │  │   Electron   │                 │
│  │   (Web App)  │  │   (Canvas)   │  │  (Desktop)   │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    FastAPI / Next.js API Routes                   │ │
│  │         REST API  │  WebSocket Server  │  GraphQL (optional)      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│     AUTH SERVICE     │ │   QUEUE SERVICE  │ │   STORAGE SERVICE    │
│  ┌────────────────┐  │ │ ┌──────────────┐ │ │ ┌────────────────┐   │
│  │  NextAuth.js   │  │ │ │    Redis     │ │ │ │      S3        │   │
│  │  Clerk/Auth0   │  │ │ │   BullMQ     │ │ │ │  CloudFlare R2 │   │
│  └────────────────┘  │ │ └──────────────┘ │ │ └────────────────┘   │
└──────────────────────┘ └──────────────────┘ └──────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           AI INFERENCE LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  Real-Time   │  │    Batch     │  │   Training   │                 │
│  │   Workers    │  │   Workers    │  │   Workers    │                 │
│  │  (LCM/Stream)│  │  (SDXL/Flux) │  │   (LoRA)     │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                         │
│  Infrastructure Options:                                                │
│  • Self-hosted: RunPod, Vast.ai, Lambda Labs                           │
│  • Managed: fal.ai, Replicate, Modal, Together AI                      │
│  • Hybrid: Critical paths self-hosted, burst to managed                │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              DATABASE                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  PostgreSQL  │  │    Redis     │  │  Pinecone/   │                 │
│  │  (Primary)   │  │   (Cache)    │  │  Qdrant      │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Frontend Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | **Next.js 15** + React 19 | Server components, API routes, excellent DX |
| Canvas | **Konva.js** + React-Konva | Krea uses Svelte-Konva; Konva is the core library |
| Styling | **Tailwind CSS v4** | Rapid UI development |
| State | **Zustand** | Simple, performant state management |
| Real-time | **WebSocket API** | Native browser API for streaming |
| 3D | **Three.js** + React Three Fiber | 3D viewer and scene editor |
| Video | **FFmpeg.wasm** | Client-side video processing |

### 3.3 Backend Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| API Server | **FastAPI** (Python) | Async, WebSocket support, ML ecosystem |
| API Routes | **Next.js API Routes** | Seamless frontend integration |
| WebSocket | **Uvicorn** + **WebSocket** | High-performance async server |
| Queue | **Redis** + **BullMQ** | Job queue for generation tasks |
| ORM | **Prisma** | Type-safe database access |
| Validation | **Zod** | Runtime type validation |

### 3.4 AI/ML Stack

| Component | Technology |
|-----------|------------|
| Inference Framework | **PyTorch** + **Diffusers** |
| Real-time Pipeline | **StreamDiffusion** or **LCM** |
| Model Serving | **vLLM** / **TensorRT** |
| Training | **LoRA** via **PEFT** library |
| Image Processing | **Pillow**, **OpenCV** |
| Video Processing | **FFmpeg**, **moviepy** |

### 3.5 Infrastructure

| Service | Options |
|---------|---------|
| Hosting | **Vercel** (frontend), **Railway** / **Fly.io** (backend) |
| GPU Compute | **fal.ai**, **Modal**, **Replicate**, **RunPod** |
| Storage | **Cloudflare R2** / **AWS S3** |
| CDN | **Cloudflare** |
| Database | **Supabase** / **PlanetScale** / **Neon** |
| Cache | **Upstash Redis** |
| Monitoring | **Sentry**, **Axiom** |

---

## 4. UI/UX Components

### 4.1 Global Navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│  [KRYA Logo]   Generate ▾   Tools ▾   [Search]   [Gallery]   [👤]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Generate Dropdown:           Tools Dropdown:                        │
│  ├─ Image                     ├─ Enhancer                           │
│  ├─ Video                     ├─ Editor                             │
│  ├─ Real-time                 ├─ Lipsync                            │
│  ├─ 3D                        ├─ Motion Transfer                    │
│  └─ Nodes                     ├─ Video Restyle                      │
│                               └─ Train Model                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Page Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Marketing homepage |
| `/app` | Dashboard | User's main workspace |
| `/image` | Image Generation | Text-to-image interface |
| `/video` | Video Generation | Video creation tools |
| `/realtime` | Real-time Canvas | Live AI canvas |
| `/3d` | 3D Generation | 3D object creation |
| `/enhancer` | Upscaler | Image enhancement |
| `/editor` | Image Editor | Inpainting/editing |
| `/lipsync` | Lipsync | Video lipsync tool |
| `/motion-transfer` | Motion Transfer | Video motion tool |
| `/video-restyle` | Video Restyle | Style transfer for video |
| `/nodes` | Workflow Editor | Node-based workflows |
| `/train` | Model Training | LoRA training interface |
| `/feed` | Gallery | Community creations |
| `/models` | Model Library | Browse AI models |
| `/pricing` | Pricing | Subscription plans |
| `/profile` | User Profile | User's public profile |
| `/settings` | Settings | Account settings |
| `/login` | Auth | Login/Register |

### 4.3 Real-Time Canvas Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [Prompt Input Field                                              ] [⚙️]  │
├────────────────────────────────────────────────────────────────────────────┤
│                              │                                             │
│   ┌─────────────────────┐    │    ┌─────────────────────────────────┐     │
│   │                     │    │    │                                 │     │
│   │                     │    │    │                                 │     │
│   │   DRAWING CANVAS    │    │    │      AI OUTPUT CANVAS           │     │
│   │                     │    │    │      (Real-time render)         │     │
│   │                     │    │    │                                 │     │
│   │                     │    │    │                                 │     │
│   └─────────────────────┘    │    └─────────────────────────────────┘     │
│                              │                                             │
├──────────────────────────────┴─────────────────────────────────────────────┤
│  [🖌️] [⬜] [⭕] [📷] [📹] [🖼️]  │  AI Strength: [━━━━━●━━━] 75%  │  [Model ▾] │
└────────────────────────────────────────────────────────────────────────────┘

Left sidebar (collapsible):
┌──────────┐
│ Layers   │
├──────────┤
│ [👁️] L1  │
│ [👁️] L2  │
│ [👁️] BG  │
├──────────┤
│ [+ Add]  │
└──────────┘
```

### 4.4 Image Generation Interface

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         IMAGE GENERATION                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Enter your prompt...                                                 │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐   │
│  │                      │  │  Model: [Flux.1 Dev          ▾]         │   │
│  │                      │  │  Aspect: [1:1] [16:9] [9:16] [4:3]      │   │
│  │   GENERATED IMAGE    │  │  Style: [None ▾]                        │   │
│  │      PREVIEW         │  │                                          │   │
│  │                      │  │  ─── Advanced ───                        │   │
│  │                      │  │  Steps: [30    ]                         │   │
│  │                      │  │  CFG:   [7.5   ]                         │   │
│  │                      │  │  Seed:  [random]  [🎲]                   │   │
│  └──────────────────────┘  │  Batch: [1] [2] [4]                      │   │
│                            │                                          │   │
│  [⬇️ Download] [❤️ Save]    │  [✨ Generate]                           │   │
│                            └──────────────────────────────────────────┘   │
│                                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│  Recent Generations:  [img1] [img2] [img3] [img4] [img5] ...              │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Component Library

**Core Components:**
```
components/
├── ui/
│   ├── Button
│   ├── Input
│   ├── Textarea
│   ├── Select
│   ├── Slider
│   ├── Toggle
│   ├── Modal
│   ├── Dropdown
│   ├── Tooltip
│   ├── Card
│   ├── Avatar
│   ├── Badge
│   ├── Tabs
│   ├── Progress
│   └── Skeleton
├── layout/
│   ├── Header
│   ├── Sidebar
│   ├── Footer
│   └── PageContainer
├── canvas/
│   ├── DrawingCanvas
│   ├── AICanvas
│   ├── LayerPanel
│   ├── ToolBar
│   └── ColorPicker
├── generation/
│   ├── PromptInput
│   ├── ModelSelector
│   ├── StylePicker
│   ├── AspectRatioSelector
│   ├── ParameterPanel
│   └── GenerationGrid
├── video/
│   ├── VideoPlayer
│   ├── VideoUploader
│   ├── TimelineEditor
│   └── FrameSelector
├── nodes/
│   ├── NodeCanvas
│   ├── Node
│   ├── NodeConnection
│   └── NodePalette
└── gallery/
    ├── ImageGrid
    ├── ImageCard
    └── ImageViewer
```

---

## 5. Database Schema

### 5.1 Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  credits_remaining INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generations (Images)
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'image', 'video', '3d', 'upscale'
  prompt TEXT,
  negative_prompt TEXT,
  model VARCHAR(100),
  parameters JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  image_url TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  prompt TEXT,
  model VARCHAR(100),
  parameters JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds FLOAT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trained Models (LoRA)
CREATE TABLE trained_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'face', 'style', 'product', 'object'
  status VARCHAR(50) DEFAULT 'pending',
  base_model VARCHAR(100),
  training_images JSONB, -- Array of image URLs
  model_url TEXT,
  trigger_word VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflows (Nodes)
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  nodes JSONB NOT NULL,
  connections JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  type VARCHAR(50), -- 'canvas', 'video', 'workflow'
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tier VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50), -- 'image_gen', 'video_gen', 'upscale', 'train'
  credits_used INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Indexes

```sql
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX idx_generations_public ON generations(is_public) WHERE is_public = true;
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_usage_logs_user_id_date ON usage_logs(user_id, created_at);
```

---

## 6. API Design

### 6.1 REST API Endpoints

#### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/oauth/google
```

#### Image Generation
```
POST   /api/generate/image          # Create image generation job
GET    /api/generate/image/:id      # Get generation status/result
GET    /api/generate/images         # List user's generations
DELETE /api/generate/image/:id      # Delete generation

POST   /api/generate/image/batch    # Batch generation (up to 4)
```

#### Video Generation
```
POST   /api/generate/video          # Create video generation job
GET    /api/generate/video/:id      # Get video status/result
GET    /api/generate/videos         # List user's videos
DELETE /api/generate/video/:id      # Delete video

POST   /api/generate/video/extend   # Extend existing video
POST   /api/generate/video/lipsync  # Lipsync job
POST   /api/generate/video/motion   # Motion transfer job
POST   /api/generate/video/restyle  # Restyle job
```

#### Enhancement
```
POST   /api/enhance/image           # Upscale/enhance image
POST   /api/enhance/video           # Upscale video
GET    /api/enhance/:id             # Get enhancement result
```

#### 3D Generation
```
POST   /api/generate/3d             # Generate 3D object
GET    /api/generate/3d/:id         # Get 3D result
```

#### Model Training
```
POST   /api/train/model             # Start training job
GET    /api/train/model/:id         # Get training status
GET    /api/train/models            # List trained models
DELETE /api/train/model/:id         # Delete trained model
```

#### Workflows
```
POST   /api/workflows               # Create workflow
GET    /api/workflows               # List workflows
GET    /api/workflows/:id           # Get workflow
PUT    /api/workflows/:id           # Update workflow
DELETE /api/workflows/:id           # Delete workflow
POST   /api/workflows/:id/run       # Execute workflow
```

#### Gallery/Feed
```
GET    /api/feed                    # Get public gallery
GET    /api/feed/:id                # Get single item
POST   /api/feed/:id/like           # Like item
POST   /api/feed/:id/remix          # Remix item
```

#### User
```
GET    /api/user/profile            # Get user profile
PUT    /api/user/profile            # Update profile
GET    /api/user/usage              # Get usage stats
GET    /api/user/subscription       # Get subscription info
```

### 6.2 WebSocket API

#### Real-Time Generation Connection
```javascript
// Connect to real-time generation
ws://api.krya.ai/ws/realtime

// Message Types (MsgPack encoded)

// Client → Server
{
  type: "generate",
  data: {
    prompt: string,
    canvas_data: ArrayBuffer,  // Canvas image as binary
    strength: number,          // 0-1
    seed: number,
    model: string
  }
}

{
  type: "update_params",
  data: {
    prompt?: string,
    strength?: number,
    seed?: number
  }
}

// Server → Client
{
  type: "frame",
  data: ArrayBuffer  // Generated image frame
}

{
  type: "status",
  data: {
    status: "ready" | "generating" | "error",
    fps: number,
    latency_ms: number
  }
}

{
  type: "error",
  data: {
    message: string,
    code: string
  }
}
```

### 6.3 Request/Response Examples

#### Generate Image
```javascript
// Request
POST /api/generate/image
{
  "prompt": "A futuristic city at sunset, cyberpunk style",
  "negative_prompt": "blurry, low quality",
  "model": "flux-dev",
  "width": 1024,
  "height": 1024,
  "steps": 30,
  "cfg_scale": 7.5,
  "seed": -1,
  "batch_size": 1
}

// Response
{
  "id": "gen_abc123",
  "status": "processing",
  "estimated_time": 6,
  "queue_position": 0
}

// Polling response (completed)
{
  "id": "gen_abc123",
  "status": "completed",
  "images": [
    {
      "url": "https://cdn.krya.ai/generations/abc123.png",
      "thumbnail_url": "https://cdn.krya.ai/generations/abc123_thumb.png",
      "width": 1024,
      "height": 1024
    }
  ],
  "seed": 42,
  "credits_used": 1
}
```

---

## 7. AI Model Integration

### 7.1 Model Registry

```yaml
# models/registry.yaml
models:
  image_generation:
    - id: flux-dev
      name: "Flux.1 Dev"
      provider: black-forest-labs
      type: text-to-image
      max_resolution: 2048
      default_steps: 30
      supports_img2img: true

    - id: sdxl-lightning
      name: "SDXL Lightning"
      provider: bytedance
      type: text-to-image
      max_resolution: 1024
      default_steps: 4
      fast: true

    - id: flux-schnell
      name: "Flux Schnell"
      provider: black-forest-labs
      type: text-to-image
      max_resolution: 1024
      default_steps: 4
      fast: true

  realtime:
    - id: lcm-sdxl
      name: "LCM SDXL"
      provider: latent-consistency
      steps: 4
      target_fps: 10

    - id: stream-diffusion
      name: "StreamDiffusion"
      provider: cumulo-autumn
      steps: 2
      target_fps: 15

  video_generation:
    - id: kling-2.5
      name: "Kling 2.5"
      provider: kuaishou
      max_duration: 10
      resolution: 720p

    - id: runway-gen4
      name: "Runway Gen-4"
      provider: runway
      max_duration: 16
      resolution: 720p

  enhancement:
    - id: real-esrgan
      name: "Real-ESRGAN"
      provider: xinntao
      max_scale: 8

    - id: gfpgan
      name: "GFPGAN"
      provider: tencent
      type: face

  3d:
    - id: triposr
      name: "TripoSR"
      provider: stability-ai
      type: image-to-3d
```

### 7.2 Inference Pipeline

```python
# services/inference/image_generation.py

from diffusers import FluxPipeline, StableDiffusionXLPipeline
import torch

class ImageGenerationService:
    def __init__(self):
        self.models = {}

    async def load_model(self, model_id: str):
        if model_id in self.models:
            return self.models[model_id]

        if model_id == "flux-dev":
            pipe = FluxPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-dev",
                torch_dtype=torch.bfloat16
            ).to("cuda")
        elif model_id == "sdxl-lightning":
            pipe = StableDiffusionXLPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                torch_dtype=torch.float16
            ).to("cuda")
            # Load Lightning LoRA
            pipe.load_lora_weights("ByteDance/SDXL-Lightning",
                                   weight_name="sdxl_lightning_4step_lora.safetensors")

        self.models[model_id] = pipe
        return pipe

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        model_id: str = "flux-dev",
        width: int = 1024,
        height: int = 1024,
        steps: int = 30,
        cfg_scale: float = 7.5,
        seed: int = -1
    ):
        pipe = await self.load_model(model_id)

        generator = torch.Generator("cuda")
        if seed != -1:
            generator.manual_seed(seed)
        else:
            seed = generator.seed()

        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            generator=generator
        ).images[0]

        return {
            "image": image,
            "seed": seed
        }
```

### 7.3 Real-Time Pipeline

```python
# services/inference/realtime.py

from streamdiffusion import StreamDiffusion
from streamdiffusion.image_utils import postprocess_image
import torch
import asyncio

class RealtimeGenerationService:
    def __init__(self):
        self.stream = None

    async def initialize(self, model_id: str = "lcm-sdxl"):
        from diffusers import AutoPipelineForText2Image

        pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sd-turbo",
            torch_dtype=torch.float16
        ).to("cuda")

        self.stream = StreamDiffusion(
            pipe,
            t_index_list=[0, 16, 32, 45],
            torch_dtype=torch.float16,
            cfg_type="none"
        )

        # Warmup
        self.stream.prepare("warmup")
        for _ in range(4):
            self.stream()

    async def generate_frame(
        self,
        prompt: str,
        input_image = None,
        strength: float = 0.75
    ):
        self.stream.prepare(prompt)

        if input_image is not None:
            output = self.stream.img2img(input_image, strength=strength)
        else:
            output = self.stream.txt2img()

        return postprocess_image(output)
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Basic infrastructure and core image generation

**Tasks:**
- [ ] Project setup (Next.js, Tailwind, TypeScript)
- [ ] Database setup (PostgreSQL, Prisma)
- [ ] Authentication system (NextAuth.js)
- [ ] Basic UI components library
- [ ] Landing page
- [ ] User dashboard
- [ ] Basic image generation API
- [ ] Integration with one model (SDXL Lightning)
- [ ] Image storage (S3/R2)
- [ ] Basic gallery view

**Deliverables:**
- Working authentication
- Text-to-image generation
- User can view their generations

---

### Phase 2: Real-Time Canvas (Weeks 5-8)

**Goal:** Implement the signature real-time generation feature

**Tasks:**
- [ ] Canvas component (Konva.js)
- [ ] Drawing tools (brush, shapes, layers)
- [ ] WebSocket server (FastAPI/Uvicorn)
- [ ] LCM/StreamDiffusion integration
- [ ] Real-time frame streaming
- [ ] MsgPack encoding
- [ ] Input sources (webcam, screen capture)
- [ ] AI strength controls
- [ ] Real-time prompt updates

**Deliverables:**
- Fully functional real-time canvas
- Drawing with instant AI rendering
- Multiple input sources

---

### Phase 3: Video Generation (Weeks 9-12)

**Goal:** Video creation and manipulation tools

**Tasks:**
- [ ] Video generation API
- [ ] Integration with video models (Kling, Runway, etc.)
- [ ] Video player component
- [ ] Image-to-video interface
- [ ] Video extension feature
- [ ] Basic video editing timeline
- [ ] Video download/export

**Deliverables:**
- Text-to-video generation
- Image-to-video animation
- Video management

---

### Phase 4: Enhancement & Editing (Weeks 13-16)

**Goal:** Image enhancement and editing capabilities

**Tasks:**
- [ ] Upscaling service (Real-ESRGAN)
- [ ] Face enhancement (GFPGAN)
- [ ] Enhancer UI with before/after
- [ ] Inpainting implementation
- [ ] Mask drawing tools
- [ ] Outpainting feature
- [ ] Background removal
- [ ] Object removal

**Deliverables:**
- Image upscaling up to 8x
- Inpainting/outpainting
- AI-powered editing

---

### Phase 5: Advanced Video Tools (Weeks 17-20)

**Goal:** Lipsync, motion transfer, video restyle

**Tasks:**
- [ ] Lipsync implementation
- [ ] Motion transfer pipeline
- [ ] Video restyle feature
- [ ] Video upscaling
- [ ] Frame interpolation
- [ ] Audio sync tools

**Deliverables:**
- Complete video manipulation suite
- Professional-grade video tools

---

### Phase 6: 3D & Training (Weeks 21-24)

**Goal:** 3D generation and custom model training

**Tasks:**
- [ ] 3D generation API (TripoSR)
- [ ] 3D viewer (Three.js)
- [ ] Model export formats
- [ ] LoRA training pipeline
- [ ] Training dataset management
- [ ] Auto-captioning
- [ ] Training progress UI
- [ ] Model library

**Deliverables:**
- Text/image to 3D
- Custom model training
- User model library

---

### Phase 7: Workflows (Weeks 25-28)

**Goal:** Node-based workflow automation

**Tasks:**
- [ ] Node editor canvas
- [ ] Node types implementation
- [ ] Connection system
- [ ] Workflow execution engine
- [ ] Parameter passing
- [ ] Workflow templates
- [ ] Mini-app sharing

**Deliverables:**
- Visual workflow builder
- Shareable workflows

---

### Phase 8: Polish & Scale (Weeks 29-32)

**Goal:** Production readiness

**Tasks:**
- [ ] Performance optimization
- [ ] Mobile responsive design
- [ ] Subscription/payment system (Stripe)
- [ ] Usage tracking & limits
- [ ] Rate limiting
- [ ] CDN optimization
- [ ] Monitoring & logging
- [ ] Documentation
- [ ] Community gallery features
- [ ] Desktop app (Electron)

**Deliverables:**
- Production-ready platform
- Payment integration
- Community features

---

## 9. Infrastructure Requirements

### 9.1 Development Environment

```yaml
# Minimum Requirements
CPU: 8 cores
RAM: 32GB
GPU: NVIDIA RTX 3080+ (12GB VRAM) for local testing
Storage: 500GB SSD

# Recommended
CPU: 16+ cores
RAM: 64GB
GPU: NVIDIA RTX 4090 (24GB VRAM)
Storage: 1TB NVMe SSD
```

### 9.2 Production Infrastructure

#### Compute Tiers

| Tier | Instances | Use Case |
|------|-----------|----------|
| Web Servers | 2-4x 4-core | Next.js frontend |
| API Servers | 2-4x 8-core | FastAPI backend |
| Queue Workers | 2-4x 4-core | BullMQ processors |
| GPU Workers | Variable | AI inference |

#### GPU Requirements

| Task | Min VRAM | Recommended GPU |
|------|----------|-----------------|
| Real-time (LCM) | 8GB | RTX 4090, A10G |
| Image Gen (SDXL) | 12GB | A10G, A100 40GB |
| Image Gen (Flux) | 24GB | A100 40GB, H100 |
| Video Gen | 40GB+ | A100 80GB, H100 |
| Training (LoRA) | 24GB+ | A100 40GB+ |

### 9.3 Estimated Costs (Monthly)

| Service | Cost Range |
|---------|------------|
| Vercel Pro | $20-100 |
| Database (Supabase) | $25-100 |
| Redis (Upstash) | $10-50 |
| Storage (R2) | $15-100 |
| GPU Compute (fal.ai) | $500-5000+ |
| Monitoring | $20-100 |
| **Total** | **$600-5,500+** |

---

## 10. Third-Party Integrations

### 10.1 AI Model Providers

| Provider | Models | Integration |
|----------|--------|-------------|
| fal.ai | SDXL, Flux, LCM, ControlNet | REST API |
| Replicate | All major models | REST API |
| Modal | Custom deployments | Python SDK |
| Together AI | Flux, SDXL | REST API |
| Runway | Gen-4 | REST API |
| Kling | Kling 2.5 | REST API |

### 10.2 Service Integrations

| Service | Purpose |
|---------|---------|
| Stripe | Payments |
| Clerk / Auth0 | Authentication |
| Cloudflare | CDN, R2 storage |
| Sentry | Error tracking |
| Axiom | Logging |
| Resend | Email |

### 10.3 API Keys Required

```env
# Authentication
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Providers
FAL_KEY=
REPLICATE_API_TOKEN=
TOGETHER_API_KEY=
RUNWAY_API_KEY=
OPENAI_API_KEY=

# Database
DATABASE_URL=

# Storage
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring
SENTRY_DSN=
```

---

## Appendix A: File Structure

```
krya/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App router pages
│   │   │   ├── (auth)/         # Auth routes
│   │   │   ├── (dashboard)/    # Dashboard routes
│   │   │   ├── api/            # API routes
│   │   │   └── layout.tsx
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities
│   │   ├── stores/             # Zustand stores
│   │   └── styles/             # Global styles
│   │
│   ├── desktop/                # Electron app
│   └── mobile/                 # React Native app
│
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── canvas/                 # Canvas/Konva components
│   ├── api-client/             # API client library
│   ├── types/                  # Shared TypeScript types
│   └── config/                 # Shared configuration
│
├── services/
│   ├── api/                    # FastAPI backend
│   │   ├── routers/            # API routers
│   │   ├── services/           # Business logic
│   │   ├── models/             # Pydantic models
│   │   └── main.py
│   │
│   ├── inference/              # AI inference service
│   │   ├── pipelines/          # Model pipelines
│   │   ├── workers/            # Queue workers
│   │   └── server.py
│   │
│   └── realtime/               # Real-time WebSocket service
│       ├── handlers/
│       └── server.py
│
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   ├── kubernetes/             # K8s manifests
│   └── terraform/              # Infrastructure as code
│
├── prisma/
│   └── schema.prisma           # Database schema
│
├── docs/                       # Documentation
├── scripts/                    # Build/deploy scripts
└── README.md
```

---

## Appendix B: Technology Decisions

### Why Next.js over Svelte?

While Krea uses Svelte, we choose Next.js because:
1. Larger ecosystem and community
2. Better documentation
3. Vercel deployment optimization
4. React ecosystem compatibility
5. Server components for better performance

We still use **Konva.js** (the underlying library) for canvas functionality.

### Why fal.ai for Initial GPU?

1. Simple REST/WebSocket API
2. Pay-per-use pricing
3. Pre-deployed models (no setup)
4. Good real-time support
5. Can migrate to self-hosted later

### Why PostgreSQL?

1. JSONB for flexible schema
2. Excellent with Prisma
3. Battle-tested at scale
4. Rich querying capabilities

---

## Appendix C: Pricing Structure (Reference)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 50 images/day, 10 videos/day, watermark |
| Basic | $8/mo | 200 images/day, 30 videos/day, basic models |
| Pro | $28/mo | Unlimited*, all models, real-time, no watermark |
| Max | $48/mo | Highest limits, priority queue |
| Team | $40/user/mo | Collaboration, rollover credits |

*Fair use policy applies

---

## Next Steps

1. **Review and approve this plan**
2. **Set up development environment**
3. **Initialize monorepo structure**
4. **Begin Phase 1 implementation**

---

*Document Version: 1.0*
*Created: February 2026*
*Project: Krya - Krea AI Clone*
