/**
 * NVIDIA NIM Provider
 * Primary AI provider using NVIDIA's inference microservices
 * Base URL: https://integrate.api.nvidia.com/v1
 */

import type { GenerationRequest, GenerationResponse, VideoGenerationRequest, VideoGenerationResponse } from "./providers";

export class NvidiaNIMProvider {
  private baseUrl = "https://integrate.api.nvidia.com/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate image using NVIDIA NIM FLUX model
   * Model: black-forest-labs/flux-1-dev
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-1-dev",
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          width: request.width || 1024,
          height: request.height || 1024,
          steps: request.steps || 50,
          guidance_scale: request.cfgScale || 7.5,
          seed: request.seed && request.seed > 0 ? request.seed : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NVIDIA NIM error: ${response.status} ${error}`);
      }

      const data = await response.json();

      return {
        id: data.id || crypto.randomUUID(),
        status: "completed",
        imageUrl: data.data?.[0]?.url || data.url,
        images: data.data?.map((img: { url: string }) => img.url) || [data.url],
        seed: request.seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Image-to-Image generation using FLUX Kontext model
   * Model: black-forest-labs/flux-1-kontext-dev
   */
  async generateImageToImage(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      if (!request.imageUrl) {
        throw new Error("Image URL required for image-to-image");
      }

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-1-kontext-dev",
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          image: request.imageUrl,
          strength: request.strength || 0.75,
          width: request.width || 1024,
          height: request.height || 1024,
          steps: request.steps || 50,
          guidance_scale: request.cfgScale || 7.5,
          seed: request.seed && request.seed > 0 ? request.seed : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NVIDIA NIM Kontext error: ${response.status} ${error}`);
      }

      const data = await response.json();

      return {
        id: data.id || crypto.randomUUID(),
        status: "completed",
        imageUrl: data.data?.[0]?.url || data.url,
        images: data.data?.map((img: { url: string }) => img.url) || [data.url],
        seed: request.seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 3D Generation using TRELLIS model
   * Model: microsoft/trellis
   */
  async generate3D(prompt: string, imageUrl?: string): Promise<{
    id: string;
    status: string;
    modelUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/3d/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "microsoft/trellis",
          prompt,
          image: imageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NVIDIA NIM TRELLIS error: ${response.status} ${error}`);
      }

      const data = await response.json();

      return {
        id: data.id || crypto.randomUUID(),
        status: "completed",
        modelUrl: data.data?.[0]?.url || data.url,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * LLM Chat completion using Kimi K2.5
   * Model: moonshotai/kimi-k2.5
   */
  async chatCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2.5",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NVIDIA NIM Kimi error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enhance prompt using LLM
   */
  async enhancePrompt(prompt: string): Promise<string> {
    const systemPrompt = `You are an AI art prompt expert. Enhance the following prompt for image generation by adding artistic details, lighting, composition, and style guidance. Keep the core intent but make it more detailed and specific. Return only the enhanced prompt, no explanations.`;

    return this.chatCompletion(prompt, systemPrompt);
  }

  /**
   * Generate negative prompt
   */
  async generateNegativePrompt(prompt: string, style?: string): Promise<string> {
    const systemPrompt = `Generate negative prompts to avoid common artifacts for the given image generation prompt. Include things to avoid like: blurry, distorted, low quality, artifacts, etc. Consider the style and subject. Return only comma-separated negative prompts, no explanations.`;

    const fullPrompt = style ? `Prompt: ${prompt}\nStyle: ${style}` : `Prompt: ${prompt}`;
    return this.chatCompletion(fullPrompt, systemPrompt);
  }

  /**
   * Video generation (placeholder - NVIDIA NIM doesn't have video generation yet)
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: "NVIDIA NIM video generation not yet available - use fal.ai fallback",
    };
  }

  /**
   * Get generation status (placeholder for async operations)
   */
  async getStatus(id: string): Promise<GenerationResponse> {
    return {
      id,
      status: "completed",
    };
  }
}

/**
 * Check if NVIDIA NIM is available
 */
export async function checkNvidiaNIMHealth(): Promise<boolean> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available NVIDIA NIM models
 */
export async function getNvidiaNIMModels(): Promise<string[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data?.map((model: { id: string }) => model.id) || [];
  } catch {
    return [];
  }
}
