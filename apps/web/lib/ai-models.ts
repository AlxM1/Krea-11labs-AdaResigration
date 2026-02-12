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
  // FLUX Krea Dev - Primary model (local GPU, best quality)
  {
    id: "comfyui-flux",
    name: "FLUX Krea Dev (Best Quality)",
    provider: "ComfyUI",
    description: "FLUX.1 Krea Dev on RTX 5090 - best quality, free, no API costs",
    type: "quality",
    defaultSteps: 20,
    maxResolution: 2048,
    isPremium: false,
  },
  // SDXL - Fallback (local GPU, faster)
  {
    id: "comfyui-sdxl",
    name: "SDXL 1.0 (Fast)",
    provider: "ComfyUI",
    description: "Stable Diffusion XL on RTX 5090 - faster, supports negative prompts",
    type: "fast",
    defaultSteps: 20,
    maxResolution: 2048,
    isPremium: false,
  },
];

export const videoModels = [
  // SVD - Primary video model (confirmed working)
  {
    id: "svd",
    name: "SVD XT 1.1 (Local GPU)",
    provider: "ComfyUI",
    description: "Free text/image-to-video on RTX 5090 - confirmed working",
    maxDuration: 4,
    resolution: "576p",
  },
  // Wan 2.2 - Requires native nodes (not available)
  {
    id: "wan-2.2-t2v",
    name: "Wan 2.2 14B (Setup Required)",
    provider: "ComfyUI",
    description: "Requires Wan native nodes - falls back to SVD",
    maxDuration: 10,
    resolution: "1080p",
  },
  // CogVideoX - Not installed
  {
    id: "cogvideo-5b",
    name: "CogVideoX-5B (Setup Required)",
    provider: "ComfyUI",
    description: "Text-to-video - Requires CogVideoX custom nodes installation",
    maxDuration: 6,
    resolution: "480p",
  },
  // fal.ai models (require credits)
  {
    id: "kling-2.5",
    name: "Kling 2.5 (Requires fal.ai Credits)",
    provider: "Kuaishou",
    description: "Best for fast motion and action - cloud-based",
    maxDuration: 10,
    resolution: "720p",
  },
  {
    id: "runway-gen4",
    name: "Runway Gen-4 (Requires fal.ai Credits)",
    provider: "Runway",
    description: "Character consistency across shots - cloud-based",
    maxDuration: 16,
    resolution: "720p",
  },
  {
    id: "luma-ray2",
    name: "Luma Ray 2 (Requires fal.ai Credits)",
    provider: "Luma Labs",
    description: "Cinematic quality videos - cloud-based",
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
