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
  {
    id: "flux-fp8",
    name: "FLUX Dev fp8 (Best Quality)",
    provider: "ComfyUI",
    description: "FLUX.1 Dev fp8 on RTX 5090 - best quality, free, no API costs",
    type: "quality",
    defaultSteps: 20,
    maxResolution: 2048,
    isPremium: false,
  },
  {
    id: "sdxl",
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
  {
    id: "svd",
    name: "SVD XT 1.1 (Local GPU)",
    provider: "ComfyUI",
    description: "Free text/image-to-video on RTX 5090 - confirmed working",
    maxDuration: 4,
    resolution: "576p",
  },
];

/**
 * Map registry model IDs to actual ComfyUI checkpoint filenames.
 * Used as a hardcoded fallback when the registry is unavailable.
 */
export const MODEL_ID_TO_CHECKPOINT: Record<string, { filename: string; isFlux: boolean }> = {
  // New registry IDs
  "flux-fp8": { filename: "flux1-dev-fp8.safetensors", isFlux: true },
  "sdxl": { filename: "sd_xl_base_1.0.safetensors", isFlux: false },
  // Legacy IDs (backwards compat)
  "comfyui-flux": { filename: "flux1-dev-fp8.safetensors", isFlux: true },
  "comfyui-sdxl": { filename: "sd_xl_base_1.0.safetensors", isFlux: false },
};

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
