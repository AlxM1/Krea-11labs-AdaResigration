/**
 * AI Provider Integration Layer
 * Supports multiple providers: fal.ai, Replicate, Together AI, OpenAI
 */

export type AIProvider = "fal" | "replicate" | "together" | "openai" | "local";

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  model?: string;
  imageUrl?: string; // For img2img
  strength?: number;
}

export interface GenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  images?: string[];
  error?: string;
  seed?: number;
  duration?: number;
}

export interface VideoGenerationRequest {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  model?: string;
}

export interface VideoGenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  duration?: number;
}

// Provider configurations
const providerConfigs = {
  fal: {
    baseUrl: "https://fal.run",
    models: {
      "flux-schnell": "fal-ai/flux/schnell",
      "flux-dev": "fal-ai/flux/dev",
      "sdxl-lightning": "fal-ai/fast-lightning-sdxl",
      "lcm-sdxl": "fal-ai/lcm-sd15-i2i",
    },
  },
  replicate: {
    baseUrl: "https://api.replicate.com/v1",
    models: {
      "sdxl": "stability-ai/sdxl",
      "flux-schnell": "black-forest-labs/flux-schnell",
    },
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    models: {
      "flux-schnell": "black-forest-labs/FLUX.1-schnell",
    },
  },
};

/**
 * Base AI Provider class
 */
abstract class BaseProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract generateImage(request: GenerationRequest): Promise<GenerationResponse>;
  abstract generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  abstract getStatus(id: string): Promise<GenerationResponse | VideoGenerationResponse>;
}

/**
 * fal.ai Provider
 */
export class FalProvider extends BaseProvider {
  private baseUrl = "https://fal.run";

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const model = providerConfigs.fal.models[request.model as keyof typeof providerConfigs.fal.models]
      || providerConfigs.fal.models["flux-schnell"];

    try {
      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          image_size: {
            width: request.width || 1024,
            height: request.height || 1024,
          },
          num_inference_steps: request.steps || 4,
          guidance_scale: request.cfgScale || 7.5,
          seed: request.seed && request.seed > 0 ? request.seed : undefined,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`fal.ai error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.request_id || crypto.randomUUID(),
        status: "completed",
        imageUrl: data.images?.[0]?.url,
        images: data.images?.map((img: { url: string }) => img.url),
        seed: data.seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    // fal.ai video generation
    try {
      const response = await fetch(`${this.baseUrl}/fal-ai/runway-gen3/turbo/image-to-video`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: request.prompt,
          image_url: request.imageUrl,
          duration: request.duration || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`fal.ai video error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.request_id || crypto.randomUUID(),
        status: "completed",
        videoUrl: data.video?.url,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    // fal.ai uses synchronous API, so status is always complete or failed
    return {
      id,
      status: "completed",
    };
  }
}

/**
 * Replicate Provider
 */
export class ReplicateProvider extends BaseProvider {
  private baseUrl = "https://api.replicate.com/v1";

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      // Create prediction
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL
          input: {
            prompt: request.prompt,
            negative_prompt: request.negativePrompt,
            width: request.width || 1024,
            height: request.height || 1024,
            num_inference_steps: request.steps || 30,
            guidance_scale: request.cfgScale || 7.5,
            seed: request.seed && request.seed > 0 ? request.seed : undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        status: data.status === "succeeded" ? "completed" : "processing",
        imageUrl: data.output?.[0],
        images: data.output,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "video-model-version", // Replace with actual model
          input: {
            prompt: request.prompt,
            image: request.imageUrl,
          },
        }),
      });

      const data = await response.json();

      return {
        id: data.id,
        status: "processing",
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predictions/${id}`, {
        headers: {
          "Authorization": `Token ${this.apiKey}`,
        },
      });

      const data = await response.json();

      return {
        id: data.id,
        status: data.status === "succeeded" ? "completed"
          : data.status === "failed" ? "failed"
          : "processing",
        imageUrl: data.output?.[0],
        images: data.output,
        error: data.error,
      };
    } catch (error) {
      return {
        id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Together AI Provider
 */
export class TogetherProvider extends BaseProvider {
  private baseUrl = "https://api.together.xyz/v1";

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell-Free",
          prompt: request.prompt,
          width: request.width || 1024,
          height: request.height || 1024,
          steps: request.steps || 4,
          n: 1,
          seed: request.seed && request.seed > 0 ? request.seed : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Together error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: crypto.randomUUID(),
        status: "completed",
        imageUrl: data.data?.[0]?.url,
        images: data.data?.map((img: { url: string }) => img.url),
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async generateVideo(): Promise<VideoGenerationResponse> {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: "Video generation not supported by Together AI",
    };
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    return { id, status: "completed" };
  }
}

/**
 * Get AI provider instance
 */
export function getAIProvider(provider: AIProvider = "fal"): BaseProvider {
  switch (provider) {
    case "fal":
      return new FalProvider(process.env.FAL_KEY || "");
    case "replicate":
      return new ReplicateProvider(process.env.REPLICATE_API_TOKEN || "");
    case "together":
      return new TogetherProvider(process.env.TOGETHER_API_KEY || "");
    default:
      return new FalProvider(process.env.FAL_KEY || "");
  }
}

/**
 * Generate image using configured provider
 */
export async function generateImage(
  request: GenerationRequest,
  provider: AIProvider = "fal"
): Promise<GenerationResponse> {
  const aiProvider = getAIProvider(provider);
  return aiProvider.generateImage(request);
}

/**
 * Generate video using configured provider
 */
export async function generateVideo(
  request: VideoGenerationRequest,
  provider: AIProvider = "fal"
): Promise<VideoGenerationResponse> {
  const aiProvider = getAIProvider(provider);
  return aiProvider.generateVideo(request);
}
