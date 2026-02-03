/**
 * Image Enhancement/Upscaling utilities
 */

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
 * Upscale image using fal.ai
 */
export async function upscaleImage(request: EnhanceRequest): Promise<EnhanceResponse> {
  const apiKey = process.env.FAL_KEY;

  if (!apiKey) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      error: "FAL_KEY not configured",
    };
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
