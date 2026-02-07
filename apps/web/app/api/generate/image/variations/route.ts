import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Default user ID for personal use (no auth required)
const PERSONAL_USER_ID = "personal-user";

const variationsSchema = z.object({
  generationId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  prompt: z.string().max(2000).optional(),
  count: z.number().min(1).max(4).default(4),
  strength: z.number().min(0).max(1).default(0.75), // How different from original
  model: z.string().default("flux-schnell"),
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  steps: z.number().min(1).max(100).default(4),
  cfgScale: z.number().min(1).max(20).default(7.5),
}).refine(
  (data) => data.generationId || data.imageUrl,
  { message: "Either generationId or imageUrl is required" }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = variationsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Get source image details
    let sourceImage: { url: string; prompt?: string; width?: number; height?: number } | null = null;

    if (params.generationId) {
      const generation = await prisma.generation.findFirst({
        where: {
          id: params.generationId,
          userId: PERSONAL_USER_ID,
        },
        select: {
          imageUrl: true,
          prompt: true,
          width: true,
          height: true,
        },
      });

      if (!generation || !generation.imageUrl) {
        return NextResponse.json(
          { error: "Source generation not found or has no image" },
          { status: 404 }
        );
      }

      sourceImage = {
        url: generation.imageUrl,
        prompt: generation.prompt,
        width: generation.width || undefined,
        height: generation.height || undefined,
      };
    } else if (params.imageUrl) {
      sourceImage = { url: params.imageUrl };
    }

    if (!sourceImage) {
      return NextResponse.json(
        { error: "No source image provided" },
        { status: 400 }
      );
    }

    // Create variation set ID
    const variationSetId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use prompt from source or provided prompt
    const effectivePrompt = params.prompt || sourceImage.prompt || "Create a variation of this image";
    const width = params.width || sourceImage.width || 1024;
    const height = params.height || sourceImage.height || 1024;

    // Create generation records for each variation
    const generations = await Promise.all(
      Array.from({ length: params.count }).map((_, index) =>
        prisma.generation.create({
          data: {
            userId: PERSONAL_USER_ID,
            type: "IMAGE_TO_IMAGE",
            prompt: effectivePrompt,
            model: params.model,
            width,
            height,
            status: "PENDING",
            parameters: {
              steps: params.steps,
              cfgScale: params.cfgScale,
              strength: params.strength,
              sourceImageUrl: sourceImage!.url,
              sourceGenerationId: params.generationId,
              variationSetId,
              variationIndex: index,
              seed: Math.floor(Math.random() * 2147483647),
            },
          },
        })
      )
    );

    // Update all to processing
    await prisma.generation.updateMany({
      where: {
        id: { in: generations.map((g: { id: string }) => g.id) },
      },
      data: { status: "PROCESSING" },
    });

    return NextResponse.json({
      variationSetId,
      sourceImage: {
        url: sourceImage.url,
        prompt: sourceImage.prompt,
      },
      variations: generations.map((g: { id: string }, index: number) => ({
        id: g.id,
        index,
        status: "processing",
      })),
      totalCount: params.count,
      estimatedTime: params.steps <= 4 ? 5 : 15,
    });
  } catch (error) {
    console.error("Variations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get variation set status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const variationSetId = searchParams.get("variationSetId");

    if (!variationSetId) {
      return NextResponse.json(
        { error: "variationSetId is required" },
        { status: 400 }
      );
    }

    const generations = await prisma.generation.findMany({
      where: {
        userId: PERSONAL_USER_ID,
        parameters: {
          path: ["variationSetId"],
          equals: variationSetId,
        },
      },
      select: {
        id: true,
        status: true,
        imageUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        parameters: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (generations.length === 0) {
      return NextResponse.json(
        { error: "Variation set not found" },
        { status: 404 }
      );
    }

    // Sort by variation index
    type GenerationType = typeof generations[number];
    const sorted = generations.sort((a: GenerationType, b: GenerationType) => {
      const aIndex = (a.parameters as Record<string, number>)?.variationIndex || 0;
      const bIndex = (b.parameters as Record<string, number>)?.variationIndex || 0;
      return aIndex - bIndex;
    });

    const completed = sorted.filter((g: GenerationType) => g.status === "COMPLETED").length;
    const failed = sorted.filter((g: GenerationType) => g.status === "FAILED").length;
    const processing = sorted.filter((g: GenerationType) => g.status === "PROCESSING" || g.status === "PENDING").length;

    return NextResponse.json({
      variationSetId,
      total: sorted.length,
      completed,
      failed,
      processing,
      isComplete: processing === 0,
      variations: sorted.map((g: GenerationType, index: number) => ({
        id: g.id,
        index,
        status: g.status.toLowerCase(),
        imageUrl: g.imageUrl,
        thumbnailUrl: g.thumbnailUrl,
        width: g.width,
        height: g.height,
      })),
    });
  } catch (error) {
    console.error("Error fetching variation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
