/**
 * HuggingFace Inference API Provider
 * Free tier fallback for image generation
 */

import { GenerationRequest, GenerationResponse } from "./providers";

export class HuggingFaceProvider {
  private apiKey: string;
  private baseUrl = "https://api-inference.huggingface.co/models";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HF_TOKEN || '';
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/black-forest-labs/FLUX.1-schnell`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      // HF returns 200 even for errors, check if it's not a model loading error
      return response.ok || response.status === 503; // 503 = model loading
    } catch {
      return false;
    }
  }

  /**
   * Generate image using HuggingFace Inference API
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: 'failed',
        error: 'HF_TOKEN not configured',
      };
    }

    // Choose model based on request
    const model = this.selectModel(request.model);

    try {
      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: request.prompt,
          parameters: {
            negative_prompt: request.negativePrompt,
            width: request.width || 1024,
            height: request.height || 1024,
            num_inference_steps: request.steps || 4,
            guidance_scale: request.cfgScale || 7.5,
            seed: request.seed && request.seed > 0 ? request.seed : undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Model loading error - user should retry
        if (response.status === 503) {
          return {
            id: crypto.randomUUID(),
            status: 'failed',
            error: 'Model is loading, please try again in a few seconds',
          };
        }

        throw new Error(`HuggingFace error: ${response.status} ${errorText}`);
      }

      // Response is image blob
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;

      return {
        id: crypto.randomUUID(),
        status: 'completed',
        imageUrl,
        images: [imageUrl],
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Select appropriate model
   */
  private selectModel(requestedModel?: string): string {
    // Map common model names to HuggingFace model IDs
    const modelMap: Record<string, string> = {
      'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
      'flux-dev': 'black-forest-labs/FLUX.1-dev',
      'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
      'sd3': 'stabilityai/stable-diffusion-3-medium-diffusers',
    };

    if (requestedModel && modelMap[requestedModel]) {
      return modelMap[requestedModel];
    }

    // Default to FLUX Schnell (fastest)
    return 'black-forest-labs/FLUX.1-schnell';
  }
}

/**
 * Check HuggingFace availability
 */
export async function checkHuggingFaceHealth(): Promise<boolean> {
  if (!process.env.HF_TOKEN) {
    return false;
  }

  const provider = new HuggingFaceProvider();
  return await provider.isAvailable();
}
