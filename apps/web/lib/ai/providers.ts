/**
 * AI Provider Integration Layer
 * Supports multiple providers: fal.ai, Replicate, Together AI, OpenAI, Google
 * And local providers: ComfyUI, Ollama
 */

import { ComfyUIProvider, checkComfyUIHealth, getComfyUIModels } from "./comfyui-provider";
import { OllamaProvider, checkOllamaHealth, getOllamaModels } from "./ollama-provider";
import { GoogleAIProvider, checkGoogleAIHealth, getGoogleAIModels } from "./google-provider";

export type AIProvider = "fal" | "replicate" | "together" | "openai" | "google" | "comfyui" | "ollama";
export type ProviderMode = "cloud" | "local";

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
  private maxPollAttempts = 60;
  private pollIntervalMs = 2000;

  private async pollPrediction(id: string): Promise<{ status: string; output?: string[]; error?: string }> {
    for (let i = 0; i < this.maxPollAttempts; i++) {
      const response = await fetch(`${this.baseUrl}/predictions/${id}`, {
        headers: { "Authorization": `Token ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Replicate poll error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "succeeded") {
        return { status: "succeeded", output: data.output };
      }
      if (data.status === "failed" || data.status === "canceled") {
        return { status: "failed", error: data.error || "Prediction failed" };
      }

      // Still processing - wait and retry
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    return { status: "failed", error: "Prediction timed out" };
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
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

      // If already completed (unlikely but possible)
      if (data.status === "succeeded") {
        return {
          id: data.id,
          status: "completed",
          imageUrl: data.output?.[0],
          images: data.output,
        };
      }

      // Poll for completion
      const result = await this.pollPrediction(data.id);

      return {
        id: data.id,
        status: result.status === "succeeded" ? "completed" : "failed",
        imageUrl: result.output?.[0],
        images: result.output,
        error: result.error,
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
      const response = await fetch(`${this.baseUrl}/models/minimax/video-01-live/predictions`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt: request.prompt,
            first_frame_image: request.imageUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate video error: ${response.statusText}`);
      }

      const data = await response.json();

      // Poll for completion
      const result = await this.pollPrediction(data.id);

      return {
        id: data.id,
        status: result.status === "succeeded" ? "completed" : "failed",
        videoUrl: result.output?.[0],
        error: result.error,
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
 * Local ComfyUI Provider Wrapper (extends BaseProvider interface)
 */
class ComfyUIProviderWrapper extends BaseProvider {
  private provider: ComfyUIProvider;

  constructor() {
    super(""); // No API key needed for local
    this.provider = new ComfyUIProvider();
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    return this.provider.generateImage(request);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    return this.provider.generateVideo(request);
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    return this.provider.getStatus(id);
  }
}

/**
 * Google AI Provider Wrapper (Imagen 4 + Veo 3.1)
 */
class GoogleAIProviderWrapper extends BaseProvider {
  private provider: GoogleAIProvider;

  constructor(apiKey: string) {
    super(apiKey);
    this.provider = new GoogleAIProvider({ apiKey });
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    return this.provider.generateImage(request);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    return this.provider.generateVideo(request);
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    return this.provider.getStatus(id);
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
    case "google":
      return new GoogleAIProviderWrapper(process.env.GOOGLE_AI_API_KEY || "");
    case "comfyui":
      return new ComfyUIProviderWrapper();
    default:
      return new FalProvider(process.env.FAL_KEY || "");
  }
}

/**
 * Get Ollama provider instance for LLM operations
 */
export function getOllamaProvider(): OllamaProvider {
  return new OllamaProvider();
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

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: AIProvider;
  available: boolean;
  mode: "cloud" | "local";
  models?: string[];
  error?: string;
}

/**
 * Check health of all providers
 */
export async function checkAllProvidersHealth(): Promise<ProviderHealth[]> {
  const results: ProviderHealth[] = [];

  // Check cloud providers (based on env vars)
  if (process.env.FAL_KEY) {
    results.push({
      provider: "fal",
      available: true,
      mode: "cloud",
    });
  }

  if (process.env.REPLICATE_API_TOKEN) {
    results.push({
      provider: "replicate",
      available: true,
      mode: "cloud",
    });
  }

  if (process.env.TOGETHER_API_KEY) {
    results.push({
      provider: "together",
      available: true,
      mode: "cloud",
    });
  }

  // Check Google AI (Imagen 4 + Veo 3.1)
  if (process.env.GOOGLE_AI_API_KEY) {
    const googleAvailable = await checkGoogleAIHealth();
    if (googleAvailable) {
      const models = await getGoogleAIModels();
      results.push({
        provider: "google",
        available: true,
        mode: "cloud",
        models: models,
      });
    } else {
      results.push({
        provider: "google",
        available: false,
        mode: "cloud",
        error: "Google AI API not reachable",
      });
    }
  }

  // Check local providers
  const comfyUIAvailable = await checkComfyUIHealth();
  if (comfyUIAvailable) {
    const models = await getComfyUIModels();
    results.push({
      provider: "comfyui",
      available: true,
      mode: "local",
      models: models.checkpoints,
    });
  } else {
    results.push({
      provider: "comfyui",
      available: false,
      mode: "local",
      error: "ComfyUI not reachable",
    });
  }

  const ollamaAvailable = await checkOllamaHealth();
  if (ollamaAvailable) {
    const models = await getOllamaModels();
    results.push({
      provider: "ollama",
      available: true,
      mode: "local",
      models: models.map((m) => m.name),
    });
  } else {
    results.push({
      provider: "ollama",
      available: false,
      mode: "local",
      error: "Ollama not reachable",
    });
  }

  return results;
}

/**
 * Get best available provider based on mode preference
 */
export async function getBestProvider(
  preferLocal: boolean = false
): Promise<AIProvider> {
  if (preferLocal) {
    // Try local providers first
    if (await checkComfyUIHealth()) {
      return "comfyui";
    }
  }

  // Fall back to cloud providers
  if (process.env.FAL_KEY) return "fal";
  if (process.env.GOOGLE_AI_API_KEY) return "google";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  if (process.env.TOGETHER_API_KEY) return "together";

  // Last resort: try local even if not preferred
  if (await checkComfyUIHealth()) {
    return "comfyui";
  }

  return "fal"; // Default
}

/**
 * Enhanced prompt using Ollama (if available)
 */
export async function enhancePrompt(prompt: string): Promise<string> {
  try {
    if (await checkOllamaHealth()) {
      const ollama = getOllamaProvider();
      return await ollama.enhancePrompt(prompt);
    }
  } catch (error) {
    console.warn("Prompt enhancement failed:", error);
  }
  return prompt;
}

/**
 * Generate negative prompt using Ollama (if available)
 */
export async function generateNegativePrompt(prompt: string): Promise<string | undefined> {
  try {
    if (await checkOllamaHealth()) {
      const ollama = getOllamaProvider();
      return await ollama.generateNegativePrompt(prompt);
    }
  } catch (error) {
    console.warn("Negative prompt generation failed:", error);
  }
  return undefined;
}

// Re-export provider utilities
export {
  checkComfyUIHealth,
  getComfyUIModels,
  checkOllamaHealth,
  getOllamaModels,
  checkGoogleAIHealth,
  getGoogleAIModels,
  ComfyUIProvider,
  OllamaProvider,
  GoogleAIProvider,
};
