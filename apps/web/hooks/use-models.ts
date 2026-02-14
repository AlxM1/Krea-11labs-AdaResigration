"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { TaskType, ModelInfo } from "@/lib/ai/model-registry";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
  comfyuiOnline: boolean;
}

// Module-level cache shared across all hook instances
let cachedData: ModelsResponse | null = null;
let cacheTime = 0;
let fetchPromise: Promise<ModelsResponse | null> | null = null;

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const REVALIDATE_ON_FOCUS_INTERVAL = 60 * 1000; // 60 seconds

async function fetchModels(): Promise<ModelsResponse | null> {
  try {
    const res = await fetch("/api/ai/models");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getOrFetch(): Promise<ModelsResponse | null> {
  const now = Date.now();
  if (cachedData && now - cacheTime < STALE_TIME) {
    return Promise.resolve(cachedData);
  }
  if (!fetchPromise) {
    fetchPromise = fetchModels().then((data) => {
      if (data) {
        cachedData = data;
        cacheTime = Date.now();
      }
      fetchPromise = null;
      return data;
    });
  }
  return fetchPromise;
}

// Static fallback models derived from ai-models.ts (used when fetch fails)
const FALLBACK_MODELS: Record<string, ModelInfo[]> = {
  "text-to-image": [
    {
      id: "flux-fp8", name: "FLUX Dev fp8", filename: "flux1-dev-fp8.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "FLUX.1 Dev fp8 on local GPU", isAvailable: true, priority: 1,
      config: { steps: 20, cfg: 1.0, sampler: "euler", scheduler: "simple" },
    },
    {
      id: "sdxl", name: "SDXL 1.0", filename: "sd_xl_base_1.0.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "Stable Diffusion XL on local GPU", isAvailable: true, priority: 2,
      config: { steps: 20, cfg: 7, sampler: "euler", scheduler: "normal" },
    },
  ],
  "image-to-image": [
    {
      id: "flux-fp8", name: "FLUX Dev fp8", filename: "flux1-dev-fp8.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "FLUX.1 Dev fp8 on local GPU", isAvailable: true, priority: 1,
      config: { steps: 20, cfg: 1.0, sampler: "euler", scheduler: "simple" },
    },
    {
      id: "sdxl", name: "SDXL 1.0", filename: "sd_xl_base_1.0.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "Stable Diffusion XL on local GPU", isAvailable: true, priority: 2,
      config: { steps: 20, cfg: 7, sampler: "euler", scheduler: "normal" },
    },
  ],
  "text-to-video": [
    {
      id: "svd", name: "SVD XT 1.1", filename: "svd_xt_1_1.safetensors",
      provider: "comfyui", tasks: ["text-to-video", "image-to-video"],
      description: "Stable Video Diffusion on local GPU", isAvailable: true, priority: 2,
      config: { fps: 8, width: 1024, height: 576, steps: 20, maxFrames: 25, pipeline: "split" },
    },
  ],
  "image-to-video": [
    {
      id: "svd", name: "SVD XT 1.1", filename: "svd_xt_1_1.safetensors",
      provider: "comfyui", tasks: ["text-to-video", "image-to-video"],
      description: "Stable Video Diffusion on local GPU", isAvailable: true, priority: 2,
      config: { fps: 8, width: 1024, height: 576, steps: 20, maxFrames: 25, pipeline: "split" },
    },
  ],
  upscale: [
    {
      id: "4x-ultrasharp", name: "4x UltraSharp", filename: "4x-UltraSharp.pth",
      provider: "comfyui", tasks: ["upscale"],
      description: "Best quality 4x upscaling", isAvailable: true, priority: 1,
      config: { scale: 4 },
    },
    {
      id: "real-esrgan", name: "Real-ESRGAN x4", filename: "RealESRGAN_x4plus.pth",
      provider: "comfyui", tasks: ["upscale"],
      description: "General-purpose photo upscaling", isAvailable: true, priority: 2,
      config: { scale: 4 },
    },
    {
      id: "real-esrgan-anime", name: "Real-ESRGAN Anime", filename: "RealESRGAN_x4plus_anime_6B.pth",
      provider: "comfyui", tasks: ["upscale"],
      description: "Optimized for anime/illustration", isAvailable: true, priority: 3,
      config: { scale: 4 },
    },
  ],
  enhance: [
    {
      id: "flux-fp8", name: "FLUX Dev fp8", filename: "flux1-dev-fp8.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "FLUX.1 Dev fp8 on local GPU", isAvailable: true, priority: 1,
      config: { steps: 20, cfg: 1.0, sampler: "euler", scheduler: "simple" },
    },
    {
      id: "sdxl", name: "SDXL 1.0", filename: "sd_xl_base_1.0.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "Stable Diffusion XL on local GPU", isAvailable: true, priority: 2,
      config: { steps: 20, cfg: 7, sampler: "euler", scheduler: "normal" },
    },
  ],
  logo: [
    {
      id: "flux-fp8", name: "FLUX Dev fp8", filename: "flux1-dev-fp8.safetensors",
      provider: "comfyui", tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "FLUX.1 Dev fp8 on local GPU", isAvailable: true, priority: 1,
      config: { steps: 20, cfg: 1.0, sampler: "euler", scheduler: "simple" },
    },
  ],
};

export function useModels(task: TaskType) {
  const [data, setData] = useState<ModelsResponse | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const lastFocusFetch = useRef(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await getOrFetch();
    if (result) setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Revalidate on focus
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusFetch.current > REVALIDATE_ON_FOCUS_INTERVAL) {
        lastFocusFetch.current = now;
        // Invalidate cache to force refetch
        cacheTime = 0;
        load();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const models = useMemo(() => {
    if (data?.models?.[task]?.length) {
      return data.models[task];
    }
    return FALLBACK_MODELS[task] || [];
  }, [data, task]);

  const bestModel = useMemo(() => models[0] || null, [models]);

  return { models, bestModel, isLoading };
}
