/**
 * ComfyUI Local Provider
 * Connects to a local ComfyUI instance for image and video generation
 */

import {
  GenerationRequest,
  GenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "./providers";
import { uploadFromUrl } from "../storage/upload";

// ComfyUI WebSocket client ID
let clientId: string | null = null;

// ─── VRAM Management & Health Tracking ───

/** HTTP timeout for non-generation requests (health checks, queue ops, /free) */
const HTTP_TIMEOUT = 10000; // 10s

/** Timeout for queuing a prompt */
const QUEUE_TIMEOUT = 15000; // 15s

/** Default timeout for image generation polling */
const IMAGE_GENERATION_TIMEOUT = 180000; // 3 minutes

/** Default timeout for video generation polling */
const VIDEO_GENERATION_TIMEOUT = 600000; // 10 minutes

/** How long with no progress before declaring a job stuck */
const STUCK_DETECTION_THRESHOLD = 90000; // 90 seconds

/** Health tracking state */
let consecutiveHealthFailures = 0;
const MAX_HEALTH_FAILURES = 3;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30s cache

/**
 * Get the internal ComfyUI base URL (bypasses reverse proxy)
 */
function getInternalBaseUrl(): string {
  const host = process.env.COMFYUI_HOST || "127.0.0.1";
  const port = process.env.COMFYUI_PORT || "8189";
  return `http://${host}:${port}`;
}

/**
 * Force unload all models and free VRAM
 * Call before every generation to prevent model switching freezes
 */
async function freeVRAM(config: ComfyUIConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (response.ok) {
      console.log("[ComfyUI] VRAM freed: models unloaded");
      return true;
    }
    console.warn(`[ComfyUI] Free VRAM returned ${response.status}`);
    return false;
  } catch (error) {
    console.warn("[ComfyUI] Failed to free VRAM:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Interrupt the currently running ComfyUI job
 */
async function interruptGeneration(config: ComfyUIConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/interrupt`, {
      method: "POST",
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    console.log(`[ComfyUI] Interrupt: ${response.ok ? "success" : response.status}`);
    return response.ok;
  } catch (error) {
    console.warn("[ComfyUI] Failed to interrupt:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Clear the ComfyUI queue (remove all pending jobs)
 */
async function clearQueue(config: ComfyUIConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    console.log(`[ComfyUI] Queue cleared: ${response.ok ? "success" : response.status}`);
    return response.ok;
  } catch (error) {
    console.warn("[ComfyUI] Failed to clear queue:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get current queue status from ComfyUI
 */
async function getQueueStatus(config: ComfyUIConfig): Promise<{
  running: number;
  pending: number;
} | null> {
  try {
    const response = await fetch(`${config.baseUrl}/queue`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      running: data.queue_running?.length || 0,
      pending: data.queue_pending?.length || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Full recovery procedure: interrupt → clear queue → free VRAM → wait
 */
async function recoverComfyUI(config: ComfyUIConfig): Promise<boolean> {
  console.log("[ComfyUI] Starting recovery procedure...");
  await interruptGeneration(config);
  await new Promise(r => setTimeout(r, 2000));
  await clearQueue(config);
  await new Promise(r => setTimeout(r, 1000));
  const freed = await freeVRAM(config);
  await new Promise(r => setTimeout(r, 3000)); // Let GPU settle
  console.log(`[ComfyUI] Recovery complete (VRAM freed: ${freed})`);
  return freed;
}

/**
 * Check if ComfyUI is healthy (with caching and failure tracking)
 */
async function isComfyUIHealthy(config: ComfyUIConfig): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && consecutiveHealthFailures === 0) {
    return true; // Recently checked and healthy
  }

  try {
    const response = await fetch(`${config.baseUrl}/system_stats`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (response.ok) {
      consecutiveHealthFailures = 0;
      lastHealthCheck = now;
      return true;
    }
    consecutiveHealthFailures++;
  } catch {
    consecutiveHealthFailures++;
  }

  if (consecutiveHealthFailures >= MAX_HEALTH_FAILURES) {
    console.error(`[ComfyUI] UNHEALTHY: ${consecutiveHealthFailures} consecutive health check failures`);
    // Attempt recovery
    await recoverComfyUI(config);
    // Re-check after recovery
    try {
      const response = await fetch(`${config.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(HTTP_TIMEOUT),
      });
      if (response.ok) {
        consecutiveHealthFailures = 0;
        lastHealthCheck = now;
        console.log("[ComfyUI] Recovery successful, system is healthy again");
        return true;
      }
    } catch { /* still unhealthy */ }
    return false;
  }

  return true; // Not yet at failure threshold
}

/**
 * ComfyUI workflow templates
 */
const WORKFLOWS = {
  // Basic text-to-image with SDXL/Flux
  textToImage: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed: number;
    model: string;
    sampler?: string;
    scheduler?: string;
    batchSize?: number;
  }) => ({
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfgScale,
        sampler_name: params.sampler || "euler",
        scheduler: params.scheduler || "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
      class_type: "KSampler",
    },
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "5": {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: params.batchSize || 1,
      },
      class_type: "EmptyLatentImage",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: params.negativePrompt || "",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
  }),

  // Flux-specific workflow (fp8 checkpoint via CheckpointLoaderSimple + KSampler)
  fluxTextToImage: (params: {
    prompt: string;
    width: number;
    height: number;
    steps: number;
    seed: number;
    model: string;
    batchSize?: number;
  }) => ({
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: "",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "5": {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: params.batchSize || 1,
      },
      class_type: "EmptyLatentImage",
    },
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 1.0,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
      class_type: "KSampler",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya_flux",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
  }),

  // Image-to-image workflow
  imageToImage: (params: {
    prompt: string;
    negativePrompt?: string;
    imageData: string;
    strength: number;
    steps: number;
    cfgScale: number;
    seed: number;
    model: string;
  }) => ({
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfgScale,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: params.strength,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["12", 0],
      },
      class_type: "KSampler",
    },
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: params.negativePrompt || "",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya_i2i",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
    "10": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "12": {
      inputs: {
        pixels: ["10", 0],
        vae: ["4", 2],
      },
      class_type: "VAEEncode",
    },
  }),

  // Video generation with SVD (Stable Video Diffusion) - Image to Video
  imageToVideoSVD: (params: {
    imageData: string;
    frames: number;
    fps: number;
    motionBucket: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        ckpt_name: "svd_xt_1_1.safetensors",
      },
      class_type: "ImageOnlyCheckpointLoader",
    },
    "3": {
      inputs: {
        width: 1024,
        height: 576,
        video_frames: params.frames,
        motion_bucket_id: params.motionBucket,
        fps: params.fps,
        augmentation_level: 0,
        clip_vision: ["2", 1],
        init_image: ["1", 0],
        vae: ["2", 2],
      },
      class_type: "SVD_img2vid_Conditioning",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1,
        model: ["2", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent_image: ["3", 2],
      },
      class_type: "KSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["2", 2],
      },
      class_type: "VAEDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_svd",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Text to Video via Image Generation + SVD (fallback for missing Wan nodes)
  textToVideoViaSVD: (params: {
    prompt: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    seed: number;
    checkpoint: string;
  }) => ({
    // First generate an image from text
    "1": {
      inputs: {
        ckpt_name: params.checkpoint,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "2": {
      inputs: {
        width: 1024,
        height: 576,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
    },
    "3": {
      inputs: {
        text: params.prompt,
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "4": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted",
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["4", 0],
        latent_image: ["2", 0],
      },
      class_type: "KSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
      class_type: "VAEDecode",
    },
    // Now convert image to video with SVD
    "7": {
      inputs: {
        ckpt_name: "svd_xt_1_1.safetensors",
      },
      class_type: "ImageOnlyCheckpointLoader",
    },
    "8": {
      inputs: {
        width: 1024,
        height: 576,
        video_frames: params.frames,
        motion_bucket_id: 127,
        fps: params.fps,
        augmentation_level: 0,
        clip_vision: ["7", 1],
        init_image: ["6", 0],
        vae: ["7", 2],
      },
      class_type: "SVD_img2vid_Conditioning",
    },
    "9": {
      inputs: {
        seed: params.seed + 1,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1,
        model: ["7", 0],
        positive: ["8", 0],
        negative: ["8", 1],
        latent_image: ["8", 2],
      },
      class_type: "KSampler",
    },
    "10": {
      inputs: {
        samples: ["9", 0],
        vae: ["7", 2],
      },
      class_type: "VAEDecode",
    },
    "11": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_svd_t2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["10", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // CogVideoX - Text to Video (Best open-source video model)
  textToVideoCogVideoX: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        ckpt_name: "cogvideo/CogVideoX-5b.safetensors",
      },
      class_type: "CogVideoXModelLoader",
    },
    "2": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "low quality, blurry, distorted",
        model: ["1", 0],
      },
      class_type: "CogVideoXTextEncode",
    },
    "3": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "CogVideoXEmptyLatent",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 6.0,
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["2", 1],
        latent: ["3", 0],
      },
      class_type: "CogVideoXSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["1", 1],
      },
      class_type: "CogVideoXDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_cogvideo",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // CogVideoX - Image to Video
  imageToVideoCogVideoX: (params: {
    imageData: string;
    prompt: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        ckpt_name: "cogvideo/CogVideoX-5b-I2V.safetensors",
      },
      class_type: "CogVideoXModelLoader",
    },
    "3": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "low quality, blurry, distorted",
        model: ["2", 0],
      },
      class_type: "CogVideoXTextEncode",
    },
    "4": {
      inputs: {
        image: ["1", 0],
        vae: ["2", 1],
        num_frames: params.frames,
      },
      class_type: "CogVideoXImageEncode",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 6.0,
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        denoise: 1.0,
        model: ["2", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent: ["4", 0],
      },
      class_type: "CogVideoXSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["2", 1],
      },
      class_type: "CogVideoXDecode",
    },
    "7": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_cogvideo_i2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["6", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Hunyuan Video - Text to Video (High quality, uses full VRAM on RTX 5090)
  textToVideoHunyuan: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        model_path: "hunyuan/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",
        precision: "fp8_e4m3fn",
        attention_mode: "sdpa",
      },
      class_type: "HunyuanVideoModelLoader",
    },
    "2": {
      inputs: {
        vae_path: "hunyuan_video_vae_fp32.safetensors",
      },
      class_type: "HunyuanVideoVAELoader",
    },
    "3": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "blurry, low quality, distorted",
        model: ["1", 0],
      },
      class_type: "HunyuanVideoTextEncode",
    },
    "4": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "HunyuanVideoEmptyLatent",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 1.0,
        embedded_guidance_scale: 6.0,
        sampler_name: "euler",
        scheduler: "flow_shift",
        flow_shift: 7.0,
        denoise: 1.0,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent: ["4", 0],
      },
      class_type: "HunyuanVideoSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["2", 0],
      },
      class_type: "HunyuanVideoDecode",
    },
    "7": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_hunyuan",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["6", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // LTX Video - Fast text to video
  textToVideoLTX: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        ckpt_name: "ltx/ltx-video-2b-v0.9.safetensors",
      },
      class_type: "LTXVModelLoader",
    },
    "2": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "worst quality, inconsistent motion",
        model: ["1", 0],
      },
      class_type: "LTXVTextEncode",
    },
    "3": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "LTXVEmptyLatent",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 3.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["2", 1],
        latent: ["3", 0],
      },
      class_type: "LTXVSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["1", 1],
      },
      class_type: "LTXVDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_ltx",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Wan 2.2 - Text to Video (GGUF with dual experts)
  textToVideoWan: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
    modelPath?: string;
  }) => ({
    "1": {
      inputs: {
        unet_name: "wan2.2_t2v_high_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "2": {
      inputs: {
        unet_name: "wan2.2_t2v_low_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "3": {
      inputs: {
        clip_name1: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        clip_name2: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        type: "sd3",
      },
      class_type: "DualCLIPLoader",
    },
    "4": {
      inputs: {
        vae_name: "wan_2.1_vae.safetensors",
      },
      class_type: "VAELoader",
    },
    "5": {
      inputs: {
        text: params.prompt,
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "6": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted, static, worst quality",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        width: params.width,
        height: params.height,
        length: params.frames,
        batch_size: 1,
      },
      class_type: "EmptyWanLatentVideo",
    },
    "8": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 7.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0,
        high_noise_model: ["1", 0],
        low_noise_model: ["2", 0],
        positive: ["5", 0],
        negative: ["6", 0],
        latent_image: ["7", 0],
      },
      class_type: "WanSampler",
    },
    "9": {
      inputs: {
        samples: ["8", 0],
        vae: ["4", 0],
      },
      class_type: "VAEDecode",
    },
    "10": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_wan_t2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["9", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Wan 2.2 - Image to Video (GGUF with dual experts + CLIPVision)
  imageToVideoWan: (params: {
    imageData: string;
    prompt?: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
    modelPath?: string;
  }) => ({
    "1": {
      inputs: {
        unet_name: "wan2.2_i2v_high_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "2": {
      inputs: {
        unet_name: "wan2.2_i2v_low_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "3": {
      inputs: {
        clip_name1: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        clip_name2: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        type: "sd3",
      },
      class_type: "DualCLIPLoader",
    },
    "4": {
      inputs: {
        vae_name: "wan_2.1_vae.safetensors",
      },
      class_type: "VAELoader",
    },
    "5": {
      inputs: {
        clip_name: "clip_vision_h.safetensors",
      },
      class_type: "CLIPVisionLoader",
    },
    "6": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "7": {
      inputs: {
        clip_vision: ["5", 0],
        image: ["6", 0],
      },
      class_type: "CLIPVisionEncode",
    },
    "8": {
      inputs: {
        text: params.prompt || "high quality, smooth motion",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "9": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted, static, worst quality",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "10": {
      inputs: {
        width: 1280,
        height: 720,
        length: params.frames,
        batch_size: 1,
      },
      class_type: "EmptyWanLatentVideo",
    },
    "11": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 7.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0,
        high_noise_model: ["1", 0],
        low_noise_model: ["2", 0],
        positive: ["8", 0],
        negative: ["9", 0],
        latent_image: ["10", 0],
        clip_vision_embed: ["7", 0],
      },
      class_type: "WanSampler",
    },
    "12": {
      inputs: {
        samples: ["11", 0],
        vae: ["4", 0],
      },
      class_type: "VAEDecode",
    },
    "13": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_wan_i2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["12", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Image Upscaling with UpscaleModelLoader + ImageUpscaleWithModel (proper model-based upscale)
  upscaleImage: (params: {
    imageData: string;
    scale: number;
    upscaleModel?: string;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        model_name: params.upscaleModel || "RealESRGAN_x4plus.pth",
      },
      class_type: "UpscaleModelLoader",
    },
    "3": {
      inputs: {
        upscale_model: ["2", 0],
        image: ["1", 0],
      },
      class_type: "ImageUpscaleWithModel",
    },
    "4": {
      inputs: {
        filename_prefix: "krya_upscale",
        images: ["3", 0],
      },
      class_type: "SaveImage",
    },
  }),

  // Image Enhancement via img2img with low denoise (preserves original while improving quality)
  enhanceImage: (params: {
    imageData: string;
    denoise: number; // 0.3-0.5 recommended
    steps: number;
    cfgScale: number;
    seed: number;
    model: string;
    prompt?: string;
  }) => ({
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfgScale,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: params.denoise,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["12", 0],
      },
      class_type: "KSampler",
    },
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "6": {
      inputs: {
        text: params.prompt || "high quality, detailed, sharp, crisp, masterpiece, best quality",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: "blurry, low quality, distorted, artifacts, noise, pixelated, jpeg artifacts",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya_enhance",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
    "10": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "12": {
      inputs: {
        pixels: ["10", 0],
        vae: ["4", 2],
      },
      class_type: "VAEEncode",
    },
  }),
};

// Video model types supported
export type VideoModel = "svd" | "cogvideo" | "cogvideo-i2v" | "hunyuan" | "ltx" | "wan-t2v" | "wan-i2v";

// Map model names to internal types
function mapVideoModel(model?: string): VideoModel {
  const modelLower = (model || "").toLowerCase();
  if (modelLower.includes("wan") && modelLower.includes("i2v")) return "wan-i2v";
  if (modelLower.includes("wan") && modelLower.includes("t2v")) return "wan-t2v";
  if (modelLower.includes("wan")) return "svd"; // Wan nodes not available, fallback to SVD
  if (modelLower.includes("cogvideo") && modelLower.includes("i2v")) return "cogvideo-i2v";
  if (modelLower.includes("cogvideo") || modelLower.includes("cog")) return "cogvideo";
  if (modelLower.includes("hunyuan") || modelLower.includes("hyvideo")) return "hunyuan";
  if (modelLower.includes("ltx")) return "ltx";
  return "svd"; // Default to SVD
}

/**
 * ComfyUI Provider Configuration
 */
export interface ComfyUIConfig {
  baseUrl: string;
  outputUrl?: string; // URL to access generated files
  // Image models
  defaultModel?: string;
  fluxModel?: string;
  sdxlModel?: string;
  // Video models
  svdModel?: string;
  cogVideoModel?: string;
  cogVideoI2VModel?: string;
  hunyuanModel?: string;
  ltxModel?: string;
  wanT2VModel?: string;
  wanI2VModel?: string;
  defaultVideoModel?: VideoModel;
}

/**
 * Get default ComfyUI configuration
 */
export function getComfyUIConfig(): ComfyUIConfig {
  return {
    baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
    outputUrl: process.env.COMFYUI_OUTPUT_URL || "http://127.0.0.1:8188/view",
    // Image models - FLUX Krea Dev is primary
    defaultModel: process.env.COMFYUI_DEFAULT_MODEL || "flux1-dev-fp8.safetensors",
    fluxModel: process.env.COMFYUI_FLUX_MODEL || "flux1-dev-fp8.safetensors",
    sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
    // Video models
    svdModel: process.env.COMFYUI_SVD_MODEL || "svd_xt_1_1.safetensors",
    cogVideoModel: process.env.COMFYUI_COGVIDEO_MODEL || "cogvideo/CogVideoX-5b.safetensors",
    cogVideoI2VModel: process.env.COMFYUI_COGVIDEO_I2V_MODEL || "cogvideo/CogVideoX-5b-I2V.safetensors",
    hunyuanModel: process.env.COMFYUI_HUNYUAN_MODEL || "hunyuan/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",
    ltxModel: process.env.COMFYUI_LTX_MODEL || "ltx/ltx-video-2b-v0.9.safetensors",
    wanT2VModel: process.env.COMFYUI_WAN_T2V_MODEL || "wan2.2-t2v/Wan2.2-T2V-A14B",
    wanI2VModel: process.env.COMFYUI_WAN_I2V_MODEL || "wan2.2-i2v/Wan2.2-I2V-A14B",
    defaultVideoModel: (process.env.COMFYUI_DEFAULT_VIDEO_MODEL as VideoModel) || "svd",
  };
}

/**
 * Check if ComfyUI is available (exported for external use)
 */
export async function checkComfyUIHealth(): Promise<boolean> {
  const config = getComfyUIConfig();
  return isComfyUIHealthy(config);
}

/**
 * Get available models from ComfyUI
 */
export async function getComfyUIModels(): Promise<{
  checkpoints: string[];
  loras: string[];
  vaes: string[];
}> {
  const config = getComfyUIConfig();

  try {
    const response = await fetch(`${config.baseUrl}/object_info/CheckpointLoaderSimple`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    const data = await response.json();
    const checkpoints = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];

    const loraResponse = await fetch(`${config.baseUrl}/object_info/LoraLoader`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    const loraData = await loraResponse.json();
    const loras = loraData?.LoraLoader?.input?.required?.lora_name?.[0] || [];

    const vaeResponse = await fetch(`${config.baseUrl}/object_info/VAELoader`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    const vaeData = await vaeResponse.json();
    const vaes = vaeData?.VAELoader?.input?.required?.vae_name?.[0] || [];

    return { checkpoints, loras, vaes };
  } catch (error) {
    console.error("Failed to get ComfyUI models:", error);
    return { checkpoints: [], loras: [], vaes: [] };
  }
}

/**
 * Queue a prompt in ComfyUI with:
 * - Health check before submission
 * - Force VRAM free before every job
 * - Retry with full recovery on failure
 * - Proper timeouts
 */
async function queuePrompt(
  workflow: Record<string, unknown>,
  config: ComfyUIConfig,
  options?: { timeout?: number; isVideo?: boolean }
): Promise<{ promptId: string; images: ComfyUIImage[]; error?: string }> {
  if (!clientId) {
    clientId = crypto.randomUUID();
  }

  const pollingTimeout = options?.timeout || (options?.isVideo ? VIDEO_GENERATION_TIMEOUT : IMAGE_GENERATION_TIMEOUT);
  const maxAttempts = 2; // 1 initial + 1 retry after recovery

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Step 1: Health check
      const healthy = await isComfyUIHealthy(config);
      if (!healthy) {
        throw new Error("ComfyUI is unresponsive. Please restart ComfyUI and try again.");
      }

      // Step 2: Free VRAM before every job (prevents model switching freezes)
      console.log(`[ComfyUI] Attempt ${attempt}/${maxAttempts}: Freeing VRAM before job...`);
      await freeVRAM(config);
      await new Promise(r => setTimeout(r, 1000)); // Let GPU settle after free

      // Step 3: Submit prompt
      const response = await fetch(`${config.baseUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: workflow,
          client_id: clientId,
        }),
        signal: AbortSignal.timeout(QUEUE_TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ComfyUI prompt error: ${errorText}`);
      }

      const { prompt_id } = await response.json();
      console.log(`[ComfyUI] Prompt queued: ${prompt_id}`);

      // Step 4: Wait for completion with progress monitoring
      const images = await waitForCompletion(prompt_id, config, pollingTimeout);
      return { promptId: prompt_id, images };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[ComfyUI] Attempt ${attempt}/${maxAttempts} failed: ${errorMsg}`);

      if (attempt < maxAttempts) {
        // Recovery: interrupt, clear queue, free VRAM, wait
        console.log("[ComfyUI] Attempting recovery before retry...");
        await recoverComfyUI(config);
      } else {
        return {
          promptId: "",
          images: [],
          error: errorMsg,
        };
      }
    }
  }

  return { promptId: "", images: [], error: "All attempts failed" };
}

interface ComfyUIImage {
  filename: string;
  subfolder: string;
  type: string;
}

/**
 * Wait for a ComfyUI prompt to complete with:
 * - Progress monitoring via /queue endpoint
 * - Stuck detection (no progress for STUCK_DETECTION_THRESHOLD)
 * - Proper timeouts on all HTTP requests
 */
async function waitForCompletion(
  promptId: string,
  config: ComfyUIConfig,
  timeout = IMAGE_GENERATION_TIMEOUT
): Promise<ComfyUIImage[]> {
  const startTime = Date.now();
  let lastProgressTime = Date.now();
  let lastQueueState = "";
  let pollCount = 0;

  while (Date.now() - startTime < timeout) {
    pollCount++;

    try {
      // Poll /history for completion
      const response = await fetch(`${config.baseUrl}/history/${promptId}`, {
        signal: AbortSignal.timeout(HTTP_TIMEOUT),
      });
      const history = await response.json();

      if (history[promptId]) {
        // Check for errors first
        if (history[promptId].status?.status_str === "error") {
          const errorDetails = JSON.stringify(history[promptId].status, null, 2);
          console.error("[ComfyUI] Workflow error:", errorDetails);
          throw new Error(`ComfyUI workflow execution failed: ${errorDetails}`);
        }

        const outputs = history[promptId].outputs;
        const images: ComfyUIImage[] = [];

        for (const nodeId in outputs) {
          const nodeOutput = outputs[nodeId];
          if (nodeOutput.images) {
            for (const image of nodeOutput.images) {
              images.push({
                filename: image.filename,
                subfolder: image.subfolder || "",
                type: image.type || "output",
              });
            }
          }
          if (nodeOutput.gifs) {
            for (const gif of nodeOutput.gifs) {
              images.push({
                filename: gif.filename,
                subfolder: gif.subfolder || "",
                type: gif.type || "output",
              });
            }
          }
        }

        if (images.length > 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[ComfyUI] Generation complete in ${elapsed}s (${images.length} outputs)`);
          return images;
        }
      }

      // Progress monitoring: check /queue every 5 polls (~5s)
      if (pollCount % 5 === 0) {
        const queueStatus = await getQueueStatus(config);
        if (queueStatus) {
          const state = `running:${queueStatus.running},pending:${queueStatus.pending}`;
          if (state !== lastQueueState) {
            lastQueueState = state;
            lastProgressTime = Date.now();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            console.log(`[ComfyUI] [${elapsed}s] Queue: ${state}`);
          }

          // Stuck detection: queue shows no jobs running AND no pending, but no output yet
          if (queueStatus.running === 0 && queueStatus.pending === 0 && !history[promptId]) {
            const stuckDuration = Date.now() - lastProgressTime;
            if (stuckDuration > STUCK_DETECTION_THRESHOLD) {
              console.error(`[ComfyUI] Job appears stuck: no queue activity for ${(stuckDuration / 1000).toFixed(0)}s`);
              throw new Error("ComfyUI job stuck: no queue activity detected");
            }
          }
        } else {
          // Can't reach /queue — ComfyUI might be frozen
          const stuckDuration = Date.now() - lastProgressTime;
          if (stuckDuration > STUCK_DETECTION_THRESHOLD) {
            console.error("[ComfyUI] Cannot reach /queue endpoint — ComfyUI may be frozen");
            throw new Error("ComfyUI unresponsive: cannot reach queue endpoint");
          }
        }
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes("failed") ||
        error.message.includes("stuck") ||
        error.message.includes("unresponsive")
      )) {
        throw error;
      }
      // Continue polling on transient network errors but track them
      const stuckDuration = Date.now() - lastProgressTime;
      if (stuckDuration > STUCK_DETECTION_THRESHOLD) {
        throw new Error("ComfyUI generation stalled: repeated network errors");
      }
    }
  }

  throw new Error(`ComfyUI generation timed out after ${(timeout / 1000).toFixed(0)}s`);
}

/**
 * Download image from ComfyUI and save to local storage
 * Uses internal ComfyUI URL (not behind Authentik)
 */
async function downloadAndSaveImage(
  image: ComfyUIImage,
  config: ComfyUIConfig,
  userId: string
): Promise<string> {
  const internalBaseUrl = getInternalBaseUrl();
  const imageUrl = `${internalBaseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;

  console.log(`[ComfyUI] Downloading from internal URL: ${imageUrl}`);

  try {
    const uploadResult = await uploadFromUrl(imageUrl, userId);
    console.log(`[ComfyUI] Saved to local storage: ${uploadResult.url}`);
    return uploadResult.url;
  } catch (error) {
    console.error(`[ComfyUI] Failed to download/save:`, error);
    throw error;
  }
}

/**
 * Map Krya model names to ComfyUI checkpoint names
 */
function mapModelToCheckpoint(model: string, config: ComfyUIConfig): { checkpoint: string; isFlux: boolean } {
  const modelLower = model?.toLowerCase() || "";

  if (modelLower.includes("sdxl") || modelLower.includes("xl")) {
    return { checkpoint: config.sdxlModel || "sd_xl_base_1.0.safetensors", isFlux: false };
  }
  if (modelLower.includes("flux")) {
    return { checkpoint: config.fluxModel || "flux1-dev-fp8.safetensors", isFlux: true };
  }

  // Default to FLUX Dev fp8 (primary model)
  return { checkpoint: config.defaultModel || "flux1-dev-fp8.safetensors", isFlux: true };
}

/**
 * ComfyUI Provider Class
 */
export class ComfyUIProvider {
  private config: ComfyUIConfig;

  constructor(config?: Partial<ComfyUIConfig>) {
    this.config = { ...getComfyUIConfig(), ...config };
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const { checkpoint, isFlux } = mapModelToCheckpoint(request.model || "", this.config);
    const seed = request.seed && request.seed > 0 ? request.seed : Math.floor(Math.random() * 2147483647);

    try {
      // Check if this is image-to-image mode
      if (request.imageUrl) {
        console.log('[img2img] Request received:', {
          hasImage: !!request.imageUrl,
          prompt: request.prompt,
          strength: request.strength || 0.75,
          model: checkpoint,
        });

        // Use img2img workflow - delegate to generateImageToImage
        return this.generateImageToImage({
          ...request,
          imageData: await this.uploadImageToComfyUI(request.imageUrl),
        });
      }

      // Select appropriate workflow for text-to-image
      const workflow = isFlux
        ? WORKFLOWS.fluxTextToImage({
            prompt: request.prompt,
            width: request.width || 1024,
            height: request.height || 1024,
            steps: request.steps || 20,
            seed,
            model: checkpoint,
            batchSize: request.batchSize,
          })
        : WORKFLOWS.textToImage({
            prompt: request.prompt,
            negativePrompt: request.negativePrompt,
            width: request.width || 1024,
            height: request.height || 1024,
            steps: request.steps || 20,
            cfgScale: request.cfgScale || 7,
            seed,
            model: checkpoint,
            batchSize: request.batchSize,
          });

      const result = await queuePrompt(workflow, this.config, { timeout: IMAGE_GENERATION_TIMEOUT });

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      const internalBaseUrl = getInternalBaseUrl();
      const imageUrls = result.images.map(img =>
        `${internalBaseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
      );

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: imageUrls[0],
        images: imageUrls,
        seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "ComfyUI generation failed",
      };
    }
  }

  async generateImageToImage(
    request: GenerationRequest & { imageData: string }
  ): Promise<GenerationResponse> {
    const { checkpoint } = mapModelToCheckpoint(request.model || "", this.config);
    const seed = request.seed && request.seed > 0 ? request.seed : Math.floor(Math.random() * 2147483647);

    try {
      const workflow = WORKFLOWS.imageToImage({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        imageData: request.imageData,
        strength: request.strength || 0.75,
        steps: request.steps || 20,
        cfgScale: request.cfgScale || 7,
        seed,
        model: checkpoint,
      });

      const result = await queuePrompt(workflow, this.config, { timeout: IMAGE_GENERATION_TIMEOUT });

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      const internalBaseUrl = getInternalBaseUrl();
      const imageUrls = result.images.map(img =>
        `${internalBaseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
      );

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: imageUrls[0],
        images: imageUrls,
        seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "ComfyUI img2img failed",
      };
    }
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    console.log('[ComfyUI Video] Starting video generation...');

    const seed = Math.floor(Math.random() * 2147483647);
    const duration = request.duration || 4;

    const videoModel = mapVideoModel(request.model) || this.config.defaultVideoModel || "cogvideo";

    const modelConfigs: Record<VideoModel, { fps: number; width: number; height: number; steps: number; maxFrames: number }> = {
      svd: { fps: 8, width: 1024, height: 576, steps: 20, maxFrames: 25 },
      cogvideo: { fps: 8, width: 720, height: 480, steps: 50, maxFrames: 49 },
      "cogvideo-i2v": { fps: 8, width: 720, height: 480, steps: 50, maxFrames: 49 },
      hunyuan: { fps: 24, width: 1280, height: 720, steps: 30, maxFrames: 129 },
      ltx: { fps: 24, width: 768, height: 512, steps: 30, maxFrames: 97 },
      "wan-t2v": { fps: 16, width: 1280, height: 720, steps: 50, maxFrames: 161 },
      "wan-i2v": { fps: 16, width: 1280, height: 720, steps: 50, maxFrames: 161 },
    };

    const modelConfig = modelConfigs[videoModel];
    const fps = modelConfig.fps;
    const frames = Math.min(duration * fps, modelConfig.maxFrames);
    const width = modelConfig.width;
    const height = modelConfig.height;
    const steps = modelConfig.steps;

    try {
      // Handle image-to-video
      if (request.imageUrl) {
        const imageData = await this.uploadImageToComfyUI(request.imageUrl);
        let workflow: Record<string, unknown>;

        switch (videoModel) {
          case "wan-i2v":
          case "wan-t2v":
            console.log('[ComfyUI Video] Using SVD for image-to-video (Wan nodes not installed)');
            workflow = WORKFLOWS.imageToVideoSVD({ imageData, frames, fps, motionBucket: 127, seed });
            break;
          case "cogvideo-i2v":
          case "cogvideo":
            workflow = WORKFLOWS.imageToVideoCogVideoX({
              imageData, prompt: request.prompt || "smooth motion, high quality video",
              negativePrompt: "blurry, low quality, distorted", frames, fps, steps, seed,
            });
            break;
          case "svd":
          default:
            workflow = WORKFLOWS.imageToVideoSVD({ imageData, frames, fps, motionBucket: 127, seed });
            break;
        }

        return this.executeVideoWorkflow(workflow, duration);
      }

      // Text-to-video: SVD-based models need 2-stage pipeline (image gen → free VRAM → SVD)
      const needsSVDSplit = videoModel === "svd" || videoModel === "wan-t2v" || videoModel === "wan-i2v";

      if (needsSVDSplit) {
        return this.generateTextToVideoSplit(request, { seed, frames, fps, duration });
      }

      // Single-stage text-to-video (CogVideo, Hunyuan, LTX)
      let workflow: Record<string, unknown>;
      switch (videoModel) {
        case "cogvideo":
        case "cogvideo-i2v":
          workflow = WORKFLOWS.textToVideoCogVideoX({
            prompt: request.prompt, negativePrompt: "blurry, low quality, distorted",
            width, height, frames, fps, steps, seed,
          });
          break;
        case "hunyuan":
          workflow = WORKFLOWS.textToVideoHunyuan({
            prompt: request.prompt, negativePrompt: "blurry, low quality, distorted",
            width, height, frames, fps, steps, seed,
          });
          break;
        case "ltx":
          workflow = WORKFLOWS.textToVideoLTX({
            prompt: request.prompt, negativePrompt: "blurry, low quality, distorted",
            width, height, frames, fps, steps, seed,
          });
          break;
        default:
          return this.generateTextToVideoSplit(request, { seed, frames, fps, duration });
      }

      return this.executeVideoWorkflow(workflow, duration);

    } catch (error) {
      return this.handleVideoError(error);
    }
  }

  /**
   * Split text-to-video: Stage 1 (SDXL image) → free VRAM → Stage 2 (SVD video)
   * Prevents VRAM exhaustion from loading both SDXL + SVD simultaneously
   */
  private async generateTextToVideoSplit(
    request: VideoGenerationRequest,
    params: { seed: number; frames: number; fps: number; duration: number }
  ): Promise<VideoGenerationResponse> {
    const { seed, frames, fps, duration } = params;

    // Stage 1: Generate initial frame with SDXL
    console.log("[ComfyUI Video] Stage 1/2: Generating initial frame with SDXL...");
    const imageWorkflow = WORKFLOWS.textToImage({
      prompt: request.prompt,
      negativePrompt: "blurry, low quality, distorted, text, watermark",
      width: 1024,
      height: 576,
      steps: 20,
      cfgScale: 7,
      seed,
      model: this.config.sdxlModel || "sd_xl_base_1.0.safetensors",
      batchSize: 1,
    });

    const imageResult = await queuePrompt(imageWorkflow, this.config, { timeout: IMAGE_GENERATION_TIMEOUT });
    if (imageResult.error || imageResult.images.length === 0) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: imageResult.error || "Failed to generate initial frame for video",
      };
    }

    console.log("[ComfyUI Video] Stage 1 complete. Transferring image to input folder...");

    // Download Stage 1 output and re-upload to ComfyUI's input folder
    // (LoadImage reads from input/, not output/)
    const internalBaseUrl = getInternalBaseUrl();
    const stg1 = imageResult.images[0];
    const stg1Url = `${internalBaseUrl}/view?filename=${stg1.filename}&subfolder=${stg1.subfolder}&type=${stg1.type}`;
    const uploadedImageName = await this.uploadImageToComfyUI(stg1Url);
    console.log(`[ComfyUI Video] Image transferred as: ${uploadedImageName}`);

    // Free VRAM between stages — this is the key fix
    console.log("[ComfyUI Video] Freeing VRAM before SVD...");
    await freeVRAM(this.config);
    await new Promise(r => setTimeout(r, 2000)); // Let GPU fully settle

    // Stage 2: Animate with SVD using the uploaded image
    console.log("[ComfyUI Video] Stage 2/2: Animating with SVD...");
    const svdWorkflow = WORKFLOWS.imageToVideoSVD({
      imageData: uploadedImageName,
      frames,
      fps,
      motionBucket: 127,
      seed: seed + 1,
    });

    const videoResult = await queuePrompt(svdWorkflow, this.config, {
      timeout: VIDEO_GENERATION_TIMEOUT,
      isVideo: true,
    });

    if (videoResult.error || videoResult.images.length === 0) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: videoResult.error || "SVD video generation failed",
      };
    }

    // Download and save
    try {
      const savedUrl = await downloadAndSaveImage(videoResult.images[0], this.config, "system");
      console.log(`[ComfyUI Video] Video saved: ${savedUrl}`);
      return { id: videoResult.promptId, status: "completed", videoUrl: savedUrl, duration };
    } catch (downloadError) {
      console.error("[ComfyUI Video] Download failed, using internal URL:", downloadError);
      const internalBaseUrl = getInternalBaseUrl();
      const v = videoResult.images[0];
      const videoUrl = `${internalBaseUrl}/view?filename=${v.filename}&subfolder=${v.subfolder}&type=${v.type}`;
      return { id: videoResult.promptId, status: "completed", videoUrl, duration };
    }
  }

  /**
   * Execute a video workflow and handle download
   */
  private async executeVideoWorkflow(
    workflow: Record<string, unknown>,
    duration: number
  ): Promise<VideoGenerationResponse> {
    const result = await queuePrompt(workflow, this.config, {
      timeout: VIDEO_GENERATION_TIMEOUT,
      isVideo: true,
    });

    if (result.error) {
      return { id: crypto.randomUUID(), status: "failed", error: result.error };
    }
    if (result.images.length === 0) {
      return { id: result.promptId, status: "failed", error: "No video output produced" };
    }

    try {
      const savedUrl = await downloadAndSaveImage(result.images[0], this.config, "system");
      console.log(`[ComfyUI Video] Video saved: ${savedUrl}`);
      return { id: result.promptId, status: "completed", videoUrl: savedUrl, duration };
    } catch (downloadError) {
      console.error("[ComfyUI Video] Download failed:", downloadError);
      const internalBaseUrl = getInternalBaseUrl();
      const v = result.images[0];
      const videoUrl = `${internalBaseUrl}/view?filename=${v.filename}&subfolder=${v.subfolder}&type=${v.type}`;
      return { id: result.promptId, status: "completed", videoUrl, duration };
    }
  }

  /**
   * Handle video generation errors with helpful messages
   */
  private handleVideoError(error: unknown): VideoGenerationResponse {
    const errorMsg = error instanceof Error ? error.message : "ComfyUI video generation failed";

    if (errorMsg.includes("not found")) {
      const nodeMatch = errorMsg.match(/(?:Node|class_type) ['"]?(\w+)['"]? (?:not found|is not available)/i);
      if (nodeMatch) {
        return {
          id: crypto.randomUUID(), status: "failed",
          error: `Missing ComfyUI node: ${nodeMatch[1]}. Install via ComfyUI Manager.`,
        };
      }
    }

    if (errorMsg.includes("not in available checkpoints") || errorMsg.includes("model not found") || errorMsg.includes("checkpoint")) {
      return {
        id: crypto.randomUUID(), status: "failed",
        error: `Model not installed. Check ComfyUI models directory.`,
      };
    }

    if (errorMsg.includes("VHS_VideoCombine")) {
      return {
        id: crypto.randomUUID(), status: "failed",
        error: "Missing ComfyUI node: VHS_VideoCombine. Install VideoHelperSuite via ComfyUI Manager.",
      };
    }

    return { id: crypto.randomUUID(), status: "failed", error: errorMsg };
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/history/${id}`, {
        signal: AbortSignal.timeout(HTTP_TIMEOUT),
      });
      const history = await response.json();

      if (!history[id]) {
        return { id, status: "processing" };
      }

      const status = history[id].status?.status_str;
      if (status === "error") {
        return { id, status: "failed", error: "Workflow execution failed" };
      }

      const images: string[] = [];
      const outputs = history[id].outputs;
      for (const nodeId in outputs) {
        if (outputs[nodeId].images) {
          for (const image of outputs[nodeId].images) {
            images.push(
              `${this.config.outputUrl}?filename=${image.filename}&type=output`
            );
          }
        }
      }

      return {
        id,
        status: images.length > 0 ? "completed" : "processing",
        images,
        imageUrl: images[0],
      };
    } catch {
      return { id, status: "processing" };
    }
  }

  /**
   * Upload an image to ComfyUI from URL or local path
   */
  private async uploadImageToComfyUI(imageUrl: string): Promise<string> {
    let imageBlob: Blob;

    // Check if this is a local file path (starts with /api/uploads/)
    if (imageUrl.startsWith("/api/uploads/")) {
      // Read from local filesystem instead of HTTP fetch
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");

      // Convert /api/uploads/temp/file.png -> /app/uploads/temp/file.png
      const filePath = imageUrl.replace("/api/uploads/", "");
      const fullPath = join(process.env.UPLOAD_DIR || "/app/uploads", filePath);

      console.log('[uploadImageToComfyUI] Reading local file:', fullPath);

      const fileBuffer = await readFile(fullPath);
      imageBlob = new Blob([fileBuffer]);
    } else {
      // Fetch from external URL
      console.log('[uploadImageToComfyUI] Fetching from URL:', imageUrl);
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      imageBlob = await imageResponse.blob();
    }

    // Create form data
    const formData = new FormData();
    formData.append("image", imageBlob, "input.png");
    formData.append("overwrite", "true");

    // Upload to ComfyUI
    const uploadResponse = await fetch(`${this.config.baseUrl}/upload/image`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to ComfyUI");
    }

    const result = await uploadResponse.json();
    console.log('[uploadImageToComfyUI] Uploaded to ComfyUI as:', result.name);
    return result.name;
  }

  /**
   * Enhance image using img2img with low denoise (preserves original, improves quality)
   */
  async enhanceImage(request: { imageUrl: string; denoise?: number; prompt?: string }): Promise<GenerationResponse> {
    try {
      console.log('[ComfyUI Enhance] Starting image enhancement:', request);

      // Upload image to ComfyUI
      const imageData = await this.uploadImageToComfyUI(request.imageUrl);
      const seed = Math.floor(Math.random() * 2147483647);

      // Build enhance workflow (img2img with low denoise)
      const workflow = WORKFLOWS.enhanceImage({
        imageData,
        denoise: request.denoise || 0.35,
        steps: 20,
        cfgScale: 7,
        seed,
        model: this.config.sdxlModel || "sd_xl_base_1.0.safetensors",
        prompt: request.prompt,
      });

      // Queue and wait for completion
      const result = await queuePrompt(workflow, this.config, { timeout: IMAGE_GENERATION_TIMEOUT });

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Download and save the enhanced image
      if (result.images.length > 0) {
        const imageUrl = await downloadAndSaveImage(result.images[0], this.config, "system");
        return {
          id: result.promptId,
          status: "completed",
          imageUrl,
        };
      }

      return {
        id: result.promptId,
        status: "failed",
        error: "No image generated",
      };
    } catch (error) {
      console.error('[ComfyUI Enhance] Error:', error);
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Enhancement failed",
      };
    }
  }

  /**
   * Upscale image using UpscaleModelLoader + ImageUpscaleWithModel
   */
  async upscaleImage(request: { imageUrl: string; scale: number }): Promise<GenerationResponse> {
    try {
      console.log('[ComfyUI Upscale] Starting model-based upscale:', request);

      // Upload image to ComfyUI
      const imageData = await this.uploadImageToComfyUI(request.imageUrl);

      // Use 4x-UltraSharp for best quality upscaling
      const upscaleModel = "4x-UltraSharp.pth";

      // Build upscale workflow
      const workflow = WORKFLOWS.upscaleImage({
        imageData,
        scale: request.scale,
        upscaleModel,
      });

      // Queue and wait for completion
      const result = await queuePrompt(workflow, this.config, { timeout: IMAGE_GENERATION_TIMEOUT });

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Download and save the upscaled image
      if (result.images.length > 0) {
        const imageUrl = await downloadAndSaveImage(result.images[0], this.config, "system");

        return {
          id: result.promptId,
          status: "completed",
          imageUrl,
        };
      }

      return {
        id: result.promptId,
        status: "failed",
        error: "No image generated",
      };
    } catch (error) {
      console.error('[ComfyUI Upscale] Error:', error);
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Upscale failed",
      };
    }
  }
}

// Export utilities for external use
export { freeVRAM, recoverComfyUI, getInternalBaseUrl };
export default ComfyUIProvider;
