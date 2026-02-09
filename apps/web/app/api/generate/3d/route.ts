import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Default user ID for personal use (no auth required)
const PERSONAL_USER_ID = "personal-user";

const generate3DSchema = z.object({
  imageUrl: z.string().url(),
  model: z.enum(["triposr", "meshy", "rodin"]).default("triposr"),
  format: z.enum(["glb", "obj", "fbx"]).default("glb"),
  quality: z.enum(["draft", "standard", "high"]).default("standard"),
  removeBackground: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = generate3DSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: PERSONAL_USER_ID,
        type: "3D",
        prompt: `3D model from image`,
        model: params.model,
        status: "PROCESSING",
        parameters: {
          format: params.format,
          quality: params.quality,
          removeBackground: params.removeBackground,
          sourceImage: params.imageUrl,
        },
      },
    });

    // In production, this would call the actual 3D generation API
    // For now, we'll simulate the process
    const result = await generate3DModel(params);

    if (result.status === "failed") {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "3D generation failed" },
        { status: 500 }
      );
    }

    // Update generation record
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        imageUrl: result.previewUrl,
        parameters: {
          ...(generation.parameters as object),
          modelUrl: result.modelUrl,
          textureUrl: result.textureUrl,
        },
      },
    });

    return NextResponse.json({
      id: generation.id,
      status: result.status,
      previewUrl: result.previewUrl,
      modelUrl: result.modelUrl,
      textureUrl: result.textureUrl,
    });
  } catch (error) {
    console.error("3D generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 3D generation result type
type Generate3DResult =
  | { status: "completed"; previewUrl: string; modelUrl: string; textureUrl?: string; error?: never }
  | { status: "failed"; error: string; previewUrl?: never; modelUrl?: never; textureUrl?: never };

/**
 * Generate 3D model using provider chain
 * Tries: fal.ai TripoSR → Replicate TripoSR
 */
async function generate3DModel(params: z.infer<typeof generate3DSchema>): Promise<Generate3DResult> {
  const attempts: { provider: string; error?: string }[] = [];

  // Try fal.ai TripoSR first
  if (process.env.FAL_KEY) {
    try {
      console.log("Trying fal.ai TripoSR for 3D generation");

      const response = await fetch("https://fal.run/fal-ai/triposr", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: params.imageUrl,
          remove_background: params.removeBackground,
          foreground_ratio: 0.85,
        }),
      });

      if (!response.ok) {
        throw new Error(`fal.ai error: ${response.statusText}`);
      }

      const data = await response.json();

      // fal.ai returns GLB model URL
      return {
        status: "completed",
        previewUrl: data.preview_image?.url || params.imageUrl,
        modelUrl: data.model?.url || data.mesh?.url,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ provider: "fal.ai", error: errorMsg });
      console.error("fal.ai TripoSR failed:", errorMsg);
    }
  }

  // Try Replicate TripoSR as fallback
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log("Trying Replicate TripoSR for 3D generation");

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "230b59c0a1c3e7cd4ac02c0924b9c5e6ba8d2c7e7cc0e5d0d0c2c2f8e7c0a1c3",
          input: {
            image: params.imageUrl,
            remove_background: params.removeBackground,
            foreground_ratio: 0.85,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate error: ${response.statusText}`);
      }

      const prediction = await response.json();

      // Poll for completion
      let pollAttempts = 0;
      const maxPollAttempts = 60; // 2 minutes max

      while (pollAttempts < maxPollAttempts) {
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
            },
          }
        );

        const statusData = await statusResponse.json();

        if (statusData.status === "succeeded") {
          return {
            status: "completed",
            previewUrl: statusData.output?.preview || params.imageUrl,
            modelUrl: statusData.output?.model || statusData.output,
          };
        }

        if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(statusData.error || "Prediction failed");
        }

        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
        pollAttempts++;
      }

      throw new Error("Prediction timed out");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ provider: "Replicate", error: errorMsg });
      console.error("Replicate TripoSR failed:", errorMsg);
    }
  }

  // All providers failed
  return {
    status: "failed",
    error: `All 3D generation providers failed. Tried: ${attempts.map(a => a.provider).join(", ")}. Configure FAL_KEY or REPLICATE_API_TOKEN.`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const generations = await prisma.generation.findMany({
      where: {
        userId: PERSONAL_USER_ID,
        type: "3D",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.generation.count({
      where: {
        userId: PERSONAL_USER_ID,
        type: "3D",
      },
    });

    return NextResponse.json({ generations, total, limit, offset });
  } catch (error) {
    console.error("Error fetching 3D generations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
