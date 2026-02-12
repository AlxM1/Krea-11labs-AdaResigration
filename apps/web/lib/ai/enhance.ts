/**
 * Image Enhancement/Upscaling utilities
 */

import { ComfyUIProvider } from "./comfyui-provider";

export interface EnhanceRequest {
  imageUrl: string;
  scale: 1 | 2 | 4 | 8;
  model: "real-esrgan" | "gfpgan" | "codeformer" | "krya-enhance";
  denoise?: number;
  faceEnhance?: boolean;
}

export interface EnhanceResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  originalSize?: { width: number; height: number };
  enhancedSize?: { width: number; height: number };
  error?: string;
}

/**
 * Upscale image using fal.ai or ComfyUI fallback
 */
export async function upscaleImage(request: EnhanceRequest): Promise<EnhanceResponse> {
  // Use ComfyUI enhancement for krya-enhance model (img2img with low denoise)
  if (request.model === "krya-enhance") {
    console.log('[Enhance] Using ComfyUI img2img enhancement (krya-enhance)');
    return enhanceWithComfyUI(request);
  }

  // Use ComfyUI model-based upscale for real-esrgan
  if (request.model === "real-esrgan") {
    console.log('[Upscale] Using ComfyUI model-based upscale (real-esrgan)');
    return upscaleWithComfyUI(request);
  }

  const apiKey = process.env.FAL_KEY;

  // Try ComfyUI first if available
  if (!apiKey || apiKey === "") {
    console.log('[Upscale] FAL_KEY not configured, using ComfyUI fallback');
    return upscaleWithComfyUI(request);
  }

  try {
    // Use fal.ai's upscaling endpoint
    const response = await fetch("https://fal.run/fal-ai/creative-upscaler", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: request.imageUrl,
        scale: request.scale,
        creativity: 0.5,
        detail: 1,
        shape_preservation: 0.25,
        prompt: "high quality, detailed, sharp",
      }),
    });

    if (!response.ok) {
      throw new Error(`Upscale failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: crypto.randomUUID(),
      status: "completed",
      imageUrl: data.image?.url,
      enhancedSize: {
        width: data.image?.width,
        height: data.image?.height,
      },
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
 * Enhance faces using GFPGAN
 */
export async function enhanceFaces(imageUrl: string): Promise<EnhanceResponse> {
  const apiKey = process.env.FAL_KEY;

  if (!apiKey) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: "FAL_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://fal.run/fal-ai/face-restoration", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        face_upsample: true,
        background_enhance: true,
        codeformer_fidelity: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Face enhancement failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: crypto.randomUUID(),
      status: "completed",
      imageUrl: data.image?.url,
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
 * Remove background from image
 */
export async function removeBackground(imageUrl: string): Promise<EnhanceResponse> {
  const apiKey = process.env.FAL_KEY;

  if (!apiKey) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: "FAL_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://fal.run/fal-ai/birefnet", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Background removal failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: crypto.randomUUID(),
      status: "completed",
      imageUrl: data.image?.url,
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
 * Enhance image using ComfyUI img2img with low denoise (preserves original, improves quality)
 */
async function enhanceWithComfyUI(request: EnhanceRequest): Promise<EnhanceResponse> {
  try {
    const comfyui = new ComfyUIProvider({
      baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
      outputUrl: process.env.COMFYUI_OUTPUT_URL,
      sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
    });

    // Map denoise 0-100 to 0.0-1.0, clamped to 0.2-0.5 for enhancement
    const denoise = Math.min(0.5, Math.max(0.2, (request.denoise || 50) / 100));

    const result = await comfyui.enhanceImage({
      imageUrl: request.imageUrl,
      denoise,
    });

    if (result.status === "failed") {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: result.error || "ComfyUI enhancement failed",
      };
    }

    return {
      id: crypto.randomUUID(),
      status: "completed",
      imageUrl: result.imageUrl,
    };
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: error instanceof Error ? error.message : "ComfyUI enhancement failed",
    };
  }
}

/**
 * Upscale image using ComfyUI (fallback when fal.ai not available)
 */
async function upscaleWithComfyUI(request: EnhanceRequest): Promise<EnhanceResponse> {
  try {
    const comfyui = new ComfyUIProvider({
      baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
      outputUrl: process.env.COMFYUI_OUTPUT_URL,
      defaultModel: process.env.COMFYUI_DEFAULT_MODEL || "sd_xl_base_1.0.safetensors",
      sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
    });

    const result = await comfyui.upscaleImage({
      imageUrl: request.imageUrl,
      scale: request.scale,
    });

    if (result.status === "failed") {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: result.error || "ComfyUI upscale failed",
      };
    }

    return {
      id: crypto.randomUUID(),
      status: "completed",
      imageUrl: result.imageUrl,
    };
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: error instanceof Error ? error.message : "ComfyUI upscale failed",
    };
  }
}
