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

// Simulated 3D generation function result type
type Generate3DResult =
  | { status: "completed"; previewUrl: string; modelUrl: string; textureUrl: string; error?: never }
  | { status: "failed"; error: string; previewUrl?: never; modelUrl?: never; textureUrl?: never };

// Simulated 3D generation function
async function generate3DModel(params: z.infer<typeof generate3DSchema>): Promise<Generate3DResult> {
  // In production, call fal.ai or other 3D generation APIs
  // Example: TripoSR, Meshy, or Rodin

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return mock result for now
  return {
    status: "completed",
    previewUrl: `https://storage.krya.ai/3d/preview-${Date.now()}.png`,
    modelUrl: `https://storage.krya.ai/3d/model-${Date.now()}.${params.format}`,
    textureUrl: `https://storage.krya.ai/3d/texture-${Date.now()}.png`,
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
