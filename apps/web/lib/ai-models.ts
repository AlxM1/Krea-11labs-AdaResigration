export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  type: "fast" | "quality" | "balanced";
  defaultSteps: number;
  maxResolution: number;
  isPremium: boolean;
}

export const imageModels: AIModel[] = [
  // fal.ai models (primary provider)
  {
    id: "flux-schnell",
    name: "FLUX.1 Schnell",
    provider: "fal.ai",
    description: "Fast, high-quality generation in 4 steps",
    type: "fast",
    defaultSteps: 4,
    maxResolution: 1024,
    isPremium: false,
  },
  {
    id: "flux-dev",
    name: "FLUX.1 Dev",
    provider: "fal.ai",
    description: "Premium quality with superior aesthetics",
    type: "quality",
    defaultSteps: 30,
    maxResolution: 2048,
    isPremium: true,
  },
  {
    id: "sdxl-lightning",
    name: "SDXL Lightning",
    provider: "ByteDance",
    description: "Extremely fast 4-step generation",
    type: "fast",
    defaultSteps: 4,
    maxResolution: 1024,
    isPremium: false,
  },
  {
    id: "sdxl-turbo",
    name: "SDXL Turbo",
    provider: "Stability AI",
    description: "Real-time generation in 1-4 steps",
    type: "fast",
    defaultSteps: 4,
    maxResolution: 512,
    isPremium: false,
  },
  {
    id: "stable-diffusion-3",
    name: "Stable Diffusion 3",
    provider: "Stability AI",
    description: "Latest SD model with improved text rendering",
    type: "quality",
    defaultSteps: 28,
    maxResolution: 1536,
    isPremium: true,
  },
  {
    id: "playground-v2.5",
    name: "Playground v2.5",
    provider: "Playground AI",
    description: "Excellent for artistic and creative images",
    type: "balanced",
    defaultSteps: 25,
    maxResolution: 1024,
    isPremium: false,
  },
  // Local GPU option
  {
    id: "comfyui-flux",
    name: "FLUX.1 (Local GPU)",
    provider: "ComfyUI",
    description: "Self-hosted on local GPU server - no API costs",
    type: "quality",
    defaultSteps: 30,
    maxResolution: 2048,
    isPremium: false,
  },
];

export const videoModels = [
  {
    id: "kling-2.5",
    name: "Kling 2.5",
    provider: "Kuaishou",
    description: "Best for fast motion and action",
    maxDuration: 10,
    resolution: "720p",
  },
  {
    id: "runway-gen4",
    name: "Runway Gen-4",
    provider: "Runway",
    description: "Character consistency across shots",
    maxDuration: 16,
    resolution: "720p",
  },
  {
    id: "luma-ray2",
    name: "Luma Ray 2",
    provider: "Luma Labs",
    description: "Cinematic quality videos",
    maxDuration: 5,
    resolution: "720p",
  },
];

export const aspectRatios = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 1344, height: 768 },
  { id: "9:16", label: "9:16", width: 768, height: 1344 },
  { id: "4:3", label: "4:3", width: 1152, height: 896 },
  { id: "3:4", label: "3:4", width: 896, height: 1152 },
  { id: "21:9", label: "21:9", width: 1536, height: 640 },
];

export const stylePresets = [
  { id: "none", name: "None", prompt: "" },
  { id: "photorealistic", name: "Photorealistic", prompt: "photorealistic, 8k, ultra detailed, professional photography" },
  { id: "cinematic", name: "Cinematic", prompt: "cinematic lighting, film grain, movie still, dramatic" },
  { id: "anime", name: "Anime", prompt: "anime style, vibrant colors, detailed illustration" },
  { id: "digital-art", name: "Digital Art", prompt: "digital art, concept art, trending on artstation" },
  { id: "oil-painting", name: "Oil Painting", prompt: "oil painting, classical art, museum quality" },
  { id: "watercolor", name: "Watercolor", prompt: "watercolor painting, soft colors, artistic" },
  { id: "3d-render", name: "3D Render", prompt: "3d render, octane render, unreal engine, ray tracing" },
  { id: "pixel-art", name: "Pixel Art", prompt: "pixel art, retro game style, 16-bit" },
  { id: "cyberpunk", name: "Cyberpunk", prompt: "cyberpunk, neon lights, futuristic, dystopian" },
];
