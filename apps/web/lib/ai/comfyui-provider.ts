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

// ComfyUI WebSocket client ID
let clientId: string | null = null;

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
        batch_size: 1,
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

  // Flux-specific workflow (uses different nodes)
  fluxTextToImage: (params: {
    prompt: string;
    width: number;
    height: number;
    steps: number;
    seed: number;
    model: string;
  }) => ({
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["11", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["13", 0],
        vae: ["10", 0],
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
    "10": {
      inputs: {
        vae_name: "ae.safetensors",
      },
      class_type: "VAELoader",
    },
    "11": {
      inputs: {
        clip_name1: "t5xxl_fp16.safetensors",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
      class_type: "DualCLIPLoader",
    },
    "12": {
      inputs: {
        unet_name: params.model,
        weight_dtype: "default",
      },
      class_type: "UNETLoader",
    },
    "13": {
      inputs: {
        noise: ["25", 0],
        guider: ["22", 0],
        sampler: ["16", 0],
        sigmas: ["17", 0],
        latent_image: ["27", 0],
      },
      class_type: "SamplerCustomAdvanced",
    },
    "16": {
      inputs: {
        sampler_name: "euler",
      },
      class_type: "KSamplerSelect",
    },
    "17": {
      inputs: {
        scheduler: "simple",
        steps: params.steps,
        denoise: 1,
        model: ["12", 0],
      },
      class_type: "BasicScheduler",
    },
    "22": {
      inputs: {
        model: ["12", 0],
        conditioning: ["6", 0],
      },
      class_type: "BasicGuider",
    },
    "25": {
      inputs: {
        noise_seed: params.seed,
      },
      class_type: "RandomNoise",
    },
    "27": {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: 1,
      },
      class_type: "EmptySD3LatentImage",
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

  // Video generation with SVD
  imageToVideo: (params: {
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
        ckpt_name: "svd_xt.safetensors",
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
        filename_prefix: "krya_video",
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
};

/**
 * ComfyUI Provider Configuration
 */
export interface ComfyUIConfig {
  baseUrl: string;
  outputUrl?: string; // URL to access generated files
  defaultModel?: string;
  fluxModel?: string;
  sdxlModel?: string;
  svdModel?: string;
}

/**
 * Get default ComfyUI configuration
 */
export function getComfyUIConfig(): ComfyUIConfig {
  return {
    baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
    outputUrl: process.env.COMFYUI_OUTPUT_URL || "http://127.0.0.1:8188/view",
    defaultModel: process.env.COMFYUI_DEFAULT_MODEL || "sd_xl_base_1.0.safetensors",
    fluxModel: process.env.COMFYUI_FLUX_MODEL || "flux1-schnell.safetensors",
    sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
    svdModel: process.env.COMFYUI_SVD_MODEL || "svd_xt.safetensors",
  };
}

/**
 * Check if ComfyUI is available
 */
export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const config = getComfyUIConfig();
    const response = await fetch(`${config.baseUrl}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
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
    const response = await fetch(`${config.baseUrl}/object_info/CheckpointLoaderSimple`);
    const data = await response.json();
    const checkpoints = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];

    const loraResponse = await fetch(`${config.baseUrl}/object_info/LoraLoader`);
    const loraData = await loraResponse.json();
    const loras = loraData?.LoraLoader?.input?.required?.lora_name?.[0] || [];

    const vaeResponse = await fetch(`${config.baseUrl}/object_info/VAELoader`);
    const vaeData = await vaeResponse.json();
    const vaes = vaeData?.VAELoader?.input?.required?.vae_name?.[0] || [];

    return { checkpoints, loras, vaes };
  } catch (error) {
    console.error("Failed to get ComfyUI models:", error);
    return { checkpoints: [], loras: [], vaes: [] };
  }
}

/**
 * Queue a prompt in ComfyUI and wait for completion
 */
async function queuePrompt(
  workflow: Record<string, unknown>,
  config: ComfyUIConfig
): Promise<{ promptId: string; images: string[]; error?: string }> {
  // Get or create client ID
  if (!clientId) {
    clientId = crypto.randomUUID();
  }

  try {
    // Queue the prompt
    const response = await fetch(`${config.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ComfyUI error: ${error}`);
    }

    const { prompt_id } = await response.json();

    // Poll for completion
    const images = await waitForCompletion(prompt_id, config);

    return { promptId: prompt_id, images };
  } catch (error) {
    return {
      promptId: "",
      images: [],
      error: error instanceof Error ? error.message : "Unknown ComfyUI error",
    };
  }
}

/**
 * Wait for a ComfyUI prompt to complete
 */
async function waitForCompletion(
  promptId: string,
  config: ComfyUIConfig,
  timeout = 300000 // 5 minutes
): Promise<string[]> {
  const startTime = Date.now();
  const images: string[] = [];

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${config.baseUrl}/history/${promptId}`);
      const history = await response.json();

      if (history[promptId]) {
        const outputs = history[promptId].outputs;

        // Extract image URLs from all output nodes
        for (const nodeId in outputs) {
          const nodeOutput = outputs[nodeId];
          if (nodeOutput.images) {
            for (const image of nodeOutput.images) {
              const imageUrl = `${config.outputUrl}?filename=${image.filename}&subfolder=${image.subfolder || ""}&type=${image.type || "output"}`;
              images.push(imageUrl);
            }
          }
          // Handle video outputs
          if (nodeOutput.gifs) {
            for (const gif of nodeOutput.gifs) {
              const videoUrl = `${config.outputUrl}?filename=${gif.filename}&subfolder=${gif.subfolder || ""}&type=${gif.type || "output"}`;
              images.push(videoUrl);
            }
          }
        }

        if (images.length > 0) {
          return images;
        }

        // Check for errors
        if (history[promptId].status?.status_str === "error") {
          throw new Error("ComfyUI workflow execution failed");
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error && error.message.includes("failed")) {
        throw error;
      }
      // Continue polling on network errors
    }
  }

  throw new Error("ComfyUI generation timed out");
}

/**
 * Map Krya model names to ComfyUI checkpoint names
 */
function mapModelToCheckpoint(model: string, config: ComfyUIConfig): { checkpoint: string; isFlux: boolean } {
  const modelLower = model?.toLowerCase() || "";

  if (modelLower.includes("flux")) {
    return { checkpoint: config.fluxModel || "flux1-schnell.safetensors", isFlux: true };
  }
  if (modelLower.includes("sdxl") || modelLower.includes("xl")) {
    return { checkpoint: config.sdxlModel || "sd_xl_base_1.0.safetensors", isFlux: false };
  }

  return { checkpoint: config.defaultModel || "sd_xl_base_1.0.safetensors", isFlux: false };
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
      // Select appropriate workflow
      const workflow = isFlux
        ? WORKFLOWS.fluxTextToImage({
            prompt: request.prompt,
            width: request.width || 1024,
            height: request.height || 1024,
            steps: request.steps || 4,
            seed,
            model: checkpoint,
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
          });

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: result.images[0],
        images: result.images,
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

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: result.images[0],
        images: result.images,
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
    if (!request.imageUrl) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: "Image URL required for video generation",
      };
    }

    const seed = Math.floor(Math.random() * 2147483647);
    const duration = request.duration || 4;
    const fps = 8;
    const frames = duration * fps;

    try {
      // First, download and upload the image to ComfyUI
      const imageData = await this.uploadImageToComfyUI(request.imageUrl);

      const workflow = WORKFLOWS.imageToVideo({
        imageData,
        frames,
        fps,
        motionBucket: 127,
        seed,
      });

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      return {
        id: result.promptId,
        status: "completed",
        videoUrl: result.images[0], // Video URL from VHS_VideoCombine
        duration,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "ComfyUI video generation failed",
      };
    }
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/history/${id}`);
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
   * Upload an image to ComfyUI from URL
   */
  private async uploadImageToComfyUI(imageUrl: string): Promise<string> {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    // Create form data
    const formData = new FormData();
    formData.append("image", imageBlob, "input.png");
    formData.append("overwrite", "true");

    // Upload to ComfyUI
    const uploadResponse = await fetch(`${this.config.baseUrl}/upload/image`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to ComfyUI");
    }

    const result = await uploadResponse.json();
    return result.name;
  }
}

export default ComfyUIProvider;
