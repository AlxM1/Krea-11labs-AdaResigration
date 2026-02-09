/**
 * Stability AI Provider
 * For Stable Diffusion models via Stability AI API
 */

import { GenerationRequest, GenerationResponse } from "./providers";

export class StabilityProvider {
  private apiKey: string;
  private baseUrl = "https://api.stability.ai/v2beta";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STABILITY_API_KEY || '';
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

      const response = await fetch(`${this.baseUrl}/user/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate image using Stability AI
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: 'failed',
        error: 'STABILITY_API_KEY not configured',
      };
    }

    const model = this.selectModel(request.model);

    try {
      const formData = new FormData();
      formData.append('prompt', request.prompt);

      if (request.negativePrompt) {
        formData.append('negative_prompt', request.negativePrompt);
      }

      formData.append('output_format', 'png');
      formData.append('aspect_ratio', this.getAspectRatio(request.width, request.height));

      if (request.seed && request.seed > 0) {
        formData.append('seed', request.seed.toString());
      }

      const response = await fetch(`${this.baseUrl}/stable-image/generate/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'image/*',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI error: ${response.status} ${errorText}`);
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
        seed: request.seed,
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
   * Select appropriate model/engine
   */
  private selectModel(requestedModel?: string): string {
    // Stability AI v2beta engines
    const modelMap: Record<string, string> = {
      'sd3': 'sd3',
      'sd3-turbo': 'sd3-turbo',
      'core': 'core', // Stable Image Core
      'ultra': 'ultra', // Stable Image Ultra
    };

    if (requestedModel && modelMap[requestedModel]) {
      return modelMap[requestedModel];
    }

    // Default to core (balanced quality/speed)
    return 'core';
  }

  /**
   * Convert dimensions to aspect ratio
   */
  private getAspectRatio(width?: number, height?: number): string {
    const w = width || 1024;
    const h = height || 1024;

    // Stability AI accepts specific aspect ratios
    const ratio = w / h;

    if (ratio >= 1.7) return '16:9';
    if (ratio >= 1.4) return '3:2';
    if (ratio >= 1.2) return '4:3';
    if (ratio >= 0.9) return '1:1';
    if (ratio >= 0.7) return '3:4';
    if (ratio >= 0.5) return '2:3';
    return '9:16';
  }
}

/**
 * Check Stability AI availability
 */
export async function checkStabilityHealth(): Promise<boolean> {
  if (!process.env.STABILITY_API_KEY) {
    return false;
  }

  const provider = new StabilityProvider();
  return await provider.isAvailable();
}
