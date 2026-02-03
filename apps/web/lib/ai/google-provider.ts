/**
 * Google Gemini API Provider
 * Supports Imagen 4 (image generation) and Veo 3.1 (video generation)
 */

import {
  GenerationRequest,
  GenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "./providers";

/**
 * Google AI Configuration
 */
export interface GoogleAIConfig {
  apiKey: string;
  baseUrl?: string;
  imageModel?: string;
  videoModel?: string;
}

/**
 * Available Google AI models
 */
export const GOOGLE_MODELS = {
  // Image generation models
  image: {
    "imagen-4": "imagen-4.0-generate-preview-05-20",
    "imagen-4-fast": "imagen-4.0-fast-generate-preview-05-20",
    "imagen-4-ultra": "imagen-4.0-ultra-generate-preview-05-20",
    "gemini-image": "gemini-2.0-flash-preview-image-generation",
  },
  // Video generation models
  video: {
    "veo-3": "veo-3.0-generate-preview",
    "veo-3.1": "veo-3.1-generate-preview",
  },
} as const;

/**
 * Get default Google AI configuration
 */
export function getGoogleAIConfig(): GoogleAIConfig {
  return {
    apiKey: process.env.GOOGLE_AI_API_KEY || "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    imageModel: process.env.GOOGLE_IMAGE_MODEL || "imagen-4.0-generate-preview-05-20",
    videoModel: process.env.GOOGLE_VIDEO_MODEL || "veo-3.0-generate-preview",
  };
}

/**
 * Check if Google AI is available
 */
export async function checkGoogleAIHealth(): Promise<boolean> {
  const config = getGoogleAIConfig();
  if (!config.apiKey) return false;

  try {
    const response = await fetch(
      `${config.baseUrl}/models?key=${config.apiKey}`,
      { method: "GET", signal: AbortSignal.timeout(5000) }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available Google AI models
 */
export async function getGoogleAIModels(): Promise<string[]> {
  const config = getGoogleAIConfig();
  if (!config.apiKey) return [];

  try {
    const response = await fetch(
      `${config.baseUrl}/models?key=${config.apiKey}`
    );
    if (!response.ok) return [];

    const data = await response.json();
    return data.models
      ?.filter((m: { name: string }) =>
        m.name.includes("imagen") || m.name.includes("veo")
      )
      .map((m: { name: string }) => m.name.replace("models/", "")) || [];
  } catch {
    return [];
  }
}

/**
 * Map aspect ratio to Google's format
 */
function mapAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4/3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3/4) < 0.1) return "3:4";
  return "1:1"; // Default
}

/**
 * Google AI Provider Class
 */
export class GoogleAIProvider {
  private config: GoogleAIConfig;

  constructor(config?: Partial<GoogleAIConfig>) {
    this.config = { ...getGoogleAIConfig(), ...config };
  }

  /**
   * Generate image using Imagen 4
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.config.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: "Google AI API key not configured",
      };
    }

    // Determine which Imagen model to use
    let model = this.config.imageModel;
    if (request.model?.includes("imagen-4-ultra")) {
      model = GOOGLE_MODELS.image["imagen-4-ultra"];
    } else if (request.model?.includes("imagen-4-fast")) {
      model = GOOGLE_MODELS.image["imagen-4-fast"];
    } else if (request.model?.includes("gemini-image")) {
      model = GOOGLE_MODELS.image["gemini-image"];
    }

    const aspectRatio = mapAspectRatio(
      request.width || 1024,
      request.height || 1024
    );

    try {
      const response = await fetch(
        `${this.config.baseUrl}/models/${model}:predict?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [
              {
                prompt: request.prompt,
              },
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatio,
              negativePrompt: request.negativePrompt,
              seed: request.seed && request.seed > 0 ? request.seed : undefined,
              // Imagen 4 specific parameters
              personGeneration: "allow_adult",
              safetySetting: "block_only_high",
              addWatermark: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error?.message || `Google AI error: ${response.status}`);
      }

      const data = await response.json();

      // Extract image from response
      const prediction = data.predictions?.[0];
      if (!prediction) {
        throw new Error("No image generated");
      }

      // Google returns base64 encoded image
      const imageData = prediction.bytesBase64Encoded;
      const mimeType = prediction.mimeType || "image/png";
      const imageUrl = `data:${mimeType};base64,${imageData}`;

      return {
        id: crypto.randomUUID(),
        status: "completed",
        imageUrl,
        images: [imageUrl],
        seed: request.seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Google AI generation failed",
      };
    }
  }

  /**
   * Generate image using Gemini's native image generation
   */
  async generateImageWithGemini(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.config.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: "Google AI API key not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: request.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              responseMimeType: "text/plain",
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error?.message || `Gemini error: ${response.status}`);
      }

      const data = await response.json();

      // Extract image from Gemini response
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return {
            id: crypto.randomUUID(),
            status: "completed",
            imageUrl,
            images: [imageUrl],
          };
        }
      }

      throw new Error("No image in response");
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Gemini image generation failed",
      };
    }
  }

  /**
   * Generate video using Veo 3.1
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    if (!this.config.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: "Google AI API key not configured",
      };
    }

    // Determine video model
    let model = this.config.videoModel;
    if (request.model?.includes("veo-3.1")) {
      model = GOOGLE_MODELS.video["veo-3.1"];
    }

    // Map duration to allowed values (4, 6, or 8 seconds)
    let duration = request.duration || 8;
    if (duration < 5) duration = 4;
    else if (duration < 7) duration = 6;
    else duration = 8;

    // Map aspect ratio
    let aspectRatio = "16:9";
    if (request.aspectRatio === "9:16" || request.aspectRatio === "portrait") {
      aspectRatio = "9:16";
    } else if (request.aspectRatio === "1:1" || request.aspectRatio === "square") {
      aspectRatio = "1:1";
    }

    try {
      const requestBody: Record<string, unknown> = {
        instances: [
          {
            prompt: request.prompt,
          },
        ],
        parameters: {
          aspectRatio,
          durationSeconds: duration,
          personGeneration: "allow_adult",
          generateAudio: true, // Veo 3.1 supports native audio
        },
      };

      // Add image for image-to-video
      if (request.imageUrl) {
        // Fetch and convert image to base64 if it's a URL
        let imageBase64 = request.imageUrl;
        if (request.imageUrl.startsWith("http")) {
          const imageResponse = await fetch(request.imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          imageBase64 = Buffer.from(imageBuffer).toString("base64");
        } else if (request.imageUrl.startsWith("data:")) {
          imageBase64 = request.imageUrl.split(",")[1];
        }

        (requestBody.instances as Array<Record<string, unknown>>)[0].image = {
          bytesBase64Encoded: imageBase64,
        };
      }

      // Start video generation (async operation)
      const response = await fetch(
        `${this.config.baseUrl}/models/${model}:predictLongRunning?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error?.message || `Veo error: ${response.status}`);
      }

      const data = await response.json();
      const operationName = data.name;

      if (!operationName) {
        throw new Error("No operation ID returned");
      }

      // Poll for completion
      const result = await this.pollVideoOperation(operationName);
      return result;
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Veo video generation failed",
      };
    }
  }

  /**
   * Poll for video generation completion
   */
  private async pollVideoOperation(
    operationName: string,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<VideoGenerationResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/${operationName}?key=${this.config.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Poll error: ${response.status}`);
        }

        const data = await response.json();

        if (data.done) {
          if (data.error) {
            return {
              id: operationName,
              status: "failed",
              error: data.error.message || "Video generation failed",
            };
          }

          // Extract video from response
          const video = data.response?.generatedVideos?.[0];
          if (!video) {
            return {
              id: operationName,
              status: "failed",
              error: "No video in response",
            };
          }

          // Video is returned as base64 or URI
          let videoUrl = video.video?.uri;
          if (!videoUrl && video.video?.bytesBase64Encoded) {
            videoUrl = `data:video/mp4;base64,${video.video.bytesBase64Encoded}`;
          }

          return {
            id: operationName,
            status: "completed",
            videoUrl,
            duration: data.response?.durationSeconds,
          };
        }

        // Not done yet, wait and retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (error) {
        // Continue polling on transient errors
        console.warn(`Poll attempt ${attempt + 1} failed:`, error);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    return {
      id: operationName,
      status: "failed",
      error: "Video generation timed out",
    };
  }

  /**
   * Get video generation status
   */
  async getVideoStatus(operationName: string): Promise<VideoGenerationResponse> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/${operationName}?key=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.done) {
        if (data.error) {
          return {
            id: operationName,
            status: "failed",
            error: data.error.message,
          };
        }

        const video = data.response?.generatedVideos?.[0];
        return {
          id: operationName,
          status: "completed",
          videoUrl: video?.video?.uri,
          duration: data.response?.durationSeconds,
        };
      }

      return {
        id: operationName,
        status: "processing",
      };
    } catch (error) {
      return {
        id: operationName,
        status: "failed",
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Get image generation status (Imagen is synchronous, so this just returns completed)
   */
  async getStatus(id: string): Promise<GenerationResponse> {
    return { id, status: "completed" };
  }
}

export default GoogleAIProvider;
