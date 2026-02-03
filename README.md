# Krya - AI Creative Platform

A full-featured AI creative platform inspired by Krea AI. Generate stunning images, videos, and 3D content with real-time AI generation capabilities.

![Krya](https://via.placeholder.com/800x400/7c3aed/ffffff?text=Krya+AI+Creative+Platform)

## Features

- **Real-time Canvas** - Draw and see AI transform your art instantly with sub-50ms latency
- **Image Generation** - Create images from text with 64+ AI models
- **Video Generation** - Generate videos with Kling, Runway, Luma, and more
- **Image Enhancement** - Upscale images up to 22K resolution
- **3D Generation** - Create 3D objects from text or images
- **Custom Training** - Train your own AI models (LoRA)
- **Workflow Nodes** - Build automated AI pipelines

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Canvas**: Konva.js for drawing, WebSocket for real-time
- **Backend**: Next.js API Routes, FastAPI (for AI inference)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (Auth.js)
- **AI**: LCM, StreamDiffusion, Flux, SDXL, and more
- **Storage**: Cloudflare R2 / AWS S3

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- (Optional) GPU for local inference

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/krya.git
cd krya
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
krya/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/                # App router pages
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       ├── lib/                # Utilities
│       └── stores/             # Zustand stores
├── packages/                   # Shared packages (future)
├── services/                   # Backend services (future)
├── prisma/                     # Database schema
└── docs/                       # Documentation
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Auth.js secret key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `FAL_KEY` | fal.ai API key for AI inference | No |

See `.env.example` for all available options.

## AI Model Providers

Krya supports multiple AI model providers:

- **fal.ai** - Recommended for fast, cost-effective inference
- **Replicate** - Wide variety of models
- **Together AI** - Flux and other models
- **Modal** - Custom model deployment
- **Self-hosted** - Run your own GPU inference

## Real-time Canvas

The real-time canvas uses WebSocket connections to achieve sub-50ms generation:

1. Canvas input is sent as binary image data
2. Server processes with LCM/StreamDiffusion
3. Output frames stream back in real-time
4. Uses MsgPack for efficient binary encoding

## Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Docker

```bash
docker build -t krya .
docker run -p 3000:3000 krya
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE for details.

## Acknowledgments

- Inspired by [Krea AI](https://krea.ai)
- Built with [Next.js](https://nextjs.org)
- AI powered by [fal.ai](https://fal.ai), [Black Forest Labs](https://blackforestlabs.ai), and others
