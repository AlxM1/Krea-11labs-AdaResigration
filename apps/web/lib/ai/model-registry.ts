/**
 * Model Registry - Auto-discovers installed models from ComfyUI
 * and provides a centralized registry with priority-ordered fallbacks.
 */

// ─── Types ───

export type TaskType =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "upscale"
  | "enhance"
  | "logo";

export interface ModelInfo {
  id: string;
  name: string;
  filename: string;
  provider: "comfyui" | "fal";
  tasks: TaskType[];
  description: string;
  isAvailable: boolean;
  priority: number;
  config: Record<string, unknown>;
}

interface RegistryState {
  models: ModelInfo[];
  comfyuiOnline: boolean;
  lastRefresh: number;
  customNodes: Record<string, boolean>;
}

// ─── Constants ───

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DISCOVERY_TIMEOUT = 8000; // 8s per request

// ─── Module-level state ───

let registry: RegistryState = {
  models: [],
  comfyuiOnline: false,
  lastRefresh: 0,
  customNodes: {},
};

let refreshPromise: Promise<void> | null = null;

// ─── ComfyUI base URL ───

function getBaseUrl(): string {
  const host = process.env.COMFYUI_HOST || "127.0.0.1";
  const port = process.env.COMFYUI_PORT || "8189";
  return `http://${host}:${port}`;
}

// ─── Discovery helpers ───

async function fetchObjectInfo(nodeType: string): Promise<string[]> {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/object_info/${nodeType}`, {
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const nodeData = data?.[nodeType];
    if (!nodeData) return [];

    // Find the first input field that contains a list of model filenames
    const required = nodeData.input?.required || {};
    for (const key of Object.keys(required)) {
      const fieldDef = required[key];
      if (!Array.isArray(fieldDef)) continue;

      // Format 1: [[values], {tooltip}] — CheckpointLoaderSimple, etc.
      if (Array.isArray(fieldDef[0])) {
        return fieldDef[0] as string[];
      }

      // Format 2: ["COMBO", {options: [values]}] — UpscaleModelLoader, etc.
      if (fieldDef[0] === "COMBO" && fieldDef[1]?.options) {
        return fieldDef[1].options as string[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function isNodeAvailable(nodeType: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/object_info/${nodeType}`, {
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return !!data?.[nodeType];
  } catch {
    return false;
  }
}

// ─── Model definitions (static knowledge of what models map to) ───

function buildModelsFromDiscovery(
  checkpoints: string[],
  diffusionModels: string[],
  ggufModels: string[],
  upscaleModels: string[],
  videoCheckpoints: string[],
  vaeModels: string[],
  customNodes: Record<string, boolean>,
  wanVideoModels: string[] = [],
): ModelInfo[] {
  const models: ModelInfo[] = [];

  // ── Checkpoints ──

  const hasFluxFp8 = checkpoints.some((c) => c.includes("flux1-dev-fp8"));
  if (hasFluxFp8) {
    const filename = checkpoints.find((c) => c.includes("flux1-dev-fp8"))!;
    models.push({
      id: "flux-fp8",
      name: "FLUX Dev fp8",
      filename,
      provider: "comfyui",
      tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "FLUX.1 Dev fp8 on local GPU - best quality, free",
      isAvailable: true,
      priority: 1,
      config: { steps: 20, cfg: 1.0, sampler: "euler", scheduler: "simple" },
    });
  }

  const hasSdxl = checkpoints.some((c) => c.includes("sd_xl_base_1.0"));
  if (hasSdxl) {
    const filename = checkpoints.find((c) => c.includes("sd_xl_base_1.0"))!;
    models.push({
      id: "sdxl",
      name: "SDXL 1.0",
      filename,
      provider: "comfyui",
      tasks: ["text-to-image", "image-to-image", "logo", "enhance"],
      description: "Stable Diffusion XL on local GPU - fast, supports negative prompts",
      isAvailable: true,
      priority: 2,
      config: { steps: 20, cfg: 7, sampler: "euler", scheduler: "normal" },
    });
  }

  // ── Video: SVD ──

  const hasSvd = videoCheckpoints.some((c) => c.includes("svd_xt_1_1")) ||
    checkpoints.some((c) => c.includes("svd_xt_1_1"));
  if (hasSvd) {
    const filename = "svd_xt_1_1.safetensors";
    models.push({
      id: "svd",
      name: "SVD XT 1.1",
      filename,
      provider: "comfyui",
      tasks: ["text-to-video", "image-to-video"],
      description: "Stable Video Diffusion on local GPU - confirmed working",
      isAvailable: true,
      priority: 2, // Lower priority than Wan if Wan nodes available
      config: { fps: 8, width: 1024, height: 576, steps: 20, maxFrames: 25, pipeline: "split" },
    });
  }

  // ── Video: Wan 2.2 (requires WanVideoSampler custom node) ──

  const hasWanVideo = customNodes["WanVideoSampler"] === true;

  // Check all sources for Wan models: GGUF, UNETLoader, and WanVideoModelLoader
  const allWanModels = [...new Set([...ggufModels, ...diffusionModels, ...wanVideoModels])];
  const hasWanT2v = allWanModels.some((m) => m.includes("wan2.2_t2v_high")) &&
    allWanModels.some((m) => m.includes("wan2.2_t2v_low"));
  if (hasWanT2v && hasWanVideo) {
    // Prefer fp8_scaled safetensors over GGUF (faster loading, native precision)
    const highModel = allWanModels.find((m) => m.includes("wan2.2_t2v_high") && m.endsWith(".safetensors"))
      || allWanModels.find((m) => m.includes("wan2.2_t2v_high"))!;
    const lowModel = allWanModels.find((m) => m.includes("wan2.2_t2v_low") && m.endsWith(".safetensors"))
      || allWanModels.find((m) => m.includes("wan2.2_t2v_low"))!;
    models.push({
      id: "wan-t2v",
      name: "Wan 2.2 14B T2V",
      filename: highModel,
      provider: "comfyui",
      tasks: ["text-to-video"],
      description: "Wan 2.2 MoE text-to-video - highest quality, local GPU",
      isAvailable: true,
      priority: 1,
      config: { fps: 16, width: 832, height: 480, steps: 30, cfg: 5.0, shift: 5.0, scheduler: "unipc", maxFrames: 81, lowNoiseModel: lowModel },
    });
  }

  const hasWanI2v = allWanModels.some((m) => m.includes("wan2.2_i2v_high")) &&
    allWanModels.some((m) => m.includes("wan2.2_i2v_low"));
  if (hasWanI2v && hasWanVideo) {
    const highModel = allWanModels.find((m) => m.includes("wan2.2_i2v_high") && m.endsWith(".safetensors"))
      || allWanModels.find((m) => m.includes("wan2.2_i2v_high"))!;
    const lowModel = allWanModels.find((m) => m.includes("wan2.2_i2v_low") && m.endsWith(".safetensors"))
      || allWanModels.find((m) => m.includes("wan2.2_i2v_low"))!;
    models.push({
      id: "wan-i2v",
      name: "Wan 2.2 14B I2V",
      filename: highModel,
      provider: "comfyui",
      tasks: ["image-to-video"],
      description: "Wan 2.2 MoE image-to-video - highest quality, local GPU",
      isAvailable: true,
      priority: 1,
      config: { fps: 16, width: 832, height: 480, steps: 30, cfg: 5.0, shift: 5.0, scheduler: "unipc", maxFrames: 81, lowNoiseModel: lowModel },
    });
  }

  // ── Upscale models ──

  const hasUltraSharp = upscaleModels.some((m) => m.includes("4x-UltraSharp"));
  if (hasUltraSharp) {
    models.push({
      id: "4x-ultrasharp",
      name: "4x UltraSharp",
      filename: "4x-UltraSharp.pth",
      provider: "comfyui",
      tasks: ["upscale"],
      description: "Best quality 4x upscaling",
      isAvailable: true,
      priority: 1,
      config: { scale: 4 },
    });
  }

  const hasRealEsrgan = upscaleModels.some((m) => m.includes("RealESRGAN_x4plus") && !m.includes("anime"));
  if (hasRealEsrgan) {
    models.push({
      id: "real-esrgan",
      name: "Real-ESRGAN x4",
      filename: "RealESRGAN_x4plus.pth",
      provider: "comfyui",
      tasks: ["upscale"],
      description: "General-purpose photo upscaling",
      isAvailable: true,
      priority: 2,
      config: { scale: 4 },
    });
  }

  const hasRealEsrganAnime = upscaleModels.some((m) => m.includes("RealESRGAN_x4plus_anime"));
  if (hasRealEsrganAnime) {
    models.push({
      id: "real-esrgan-anime",
      name: "Real-ESRGAN Anime",
      filename: "RealESRGAN_x4plus_anime_6B.pth",
      provider: "comfyui",
      tasks: ["upscale"],
      description: "Optimized for anime/illustration upscaling",
      isAvailable: true,
      priority: 3,
      config: { scale: 4 },
    });
  }

  return models;
}

// ─── Public API ───

export async function refreshRegistry(): Promise<void> {
  // Deduplicate concurrent refreshes
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const baseUrl = getBaseUrl();
    console.log("[ModelRegistry] Refreshing from ComfyUI:", baseUrl);

    try {
      // Quick health check
      const healthResp = await fetch(`${baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT),
      });
      if (!healthResp.ok) {
        console.warn("[ModelRegistry] ComfyUI not reachable");
        registry = { ...registry, comfyuiOnline: false, lastRefresh: Date.now() };
        return;
      }

      // Discover all model types in parallel
      const [checkpoints, diffusionModels, ggufModels, upscaleModels, videoCheckpoints, vaeModels, wanVideoModels] =
        await Promise.all([
          fetchObjectInfo("CheckpointLoaderSimple"),
          fetchObjectInfo("UNETLoader"),
          fetchObjectInfo("UnetLoaderGGUF"),
          fetchObjectInfo("UpscaleModelLoader"),
          fetchObjectInfo("ImageOnlyCheckpointLoader"),
          fetchObjectInfo("VAELoader"),
          fetchObjectInfo("WanVideoModelLoader"),
        ]);

      // Probe custom node availability in parallel
      const [hasWanVideoSampler, hasCogVideo, hasHunyuan, hasLTX] = await Promise.all([
        isNodeAvailable("WanVideoSampler"),
        isNodeAvailable("CogVideoXModelLoader"),
        isNodeAvailable("HunyuanVideoModelLoader"),
        isNodeAvailable("LTXVModelLoader"),
      ]);

      const customNodes: Record<string, boolean> = {
        WanVideoSampler: hasWanVideoSampler,
        CogVideoXModelLoader: hasCogVideo,
        HunyuanVideoModelLoader: hasHunyuan,
        LTXVModelLoader: hasLTX,
      };

      console.log("[ModelRegistry] Discovered:", {
        checkpoints: checkpoints.length,
        diffusionModels: diffusionModels.length,
        ggufModels: ggufModels.length,
        upscaleModels: upscaleModels.length,
        videoCheckpoints: videoCheckpoints.length,
        vaeModels: vaeModels.length,
        wanVideoModels: wanVideoModels.length,
        customNodes,
      });

      const models = buildModelsFromDiscovery(
        checkpoints,
        diffusionModels,
        ggufModels,
        upscaleModels,
        videoCheckpoints,
        vaeModels,
        customNodes,
        wanVideoModels,
      );

      registry = {
        models,
        comfyuiOnline: true,
        lastRefresh: Date.now(),
        customNodes,
      };

      console.log(`[ModelRegistry] Registered ${models.length} models`);
    } catch (error) {
      console.error("[ModelRegistry] Refresh failed:", error);
      registry = { ...registry, comfyuiOnline: false, lastRefresh: Date.now() };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - registry.lastRefresh > CACHE_TTL) {
    await refreshRegistry();
  }
}

export async function getModelsForTask(task: TaskType): Promise<ModelInfo[]> {
  await ensureFresh();
  return registry.models
    .filter((m) => m.tasks.includes(task) && m.isAvailable)
    .sort((a, b) => a.priority - b.priority);
}

export async function getBestModel(task: TaskType): Promise<ModelInfo | null> {
  const models = await getModelsForTask(task);
  return models[0] || null;
}

export function getModelById(id: string): ModelInfo | null {
  return registry.models.find((m) => m.id === id) || null;
}

export function invalidateCache(): void {
  registry.lastRefresh = 0;
  console.log("[ModelRegistry] Cache invalidated");
}

export function getRegistrySnapshot(): {
  models: ModelInfo[];
  comfyuiOnline: boolean;
  lastRefresh: number;
} {
  return {
    models: registry.models,
    comfyuiOnline: registry.comfyuiOnline,
    lastRefresh: registry.lastRefresh,
  };
}
