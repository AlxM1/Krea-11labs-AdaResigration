import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Default user ID for personal use (no auth required)
const PERSONAL_USER_ID = "personal-user";

const batchGenerateSchema = z.object({
  prompts: z.array(z.object({
    prompt: z.string().min(1).max(2000),
    negativePrompt: z.string().max(1000).optional(),
    seed: z.number().optional(),
  })).min(1).max(10),
  model: z.string().default("flux-schnell"),
  width: z.number().min(256).max(2048).default(1024),
  height: z.number().min(256).max(2048).default(1024),
  steps: z.number().min(1).max(100).default(4),
  cfgScale: z.number().min(1).max(20).default(7.5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = batchGenerateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;
    const batchSize = params.prompts.length;

    // Create batch job record
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create generation records for each prompt
    const generations = await Promise.all(
      params.prompts.map((p, index) =>
        prisma.generation.create({
          data: {
            userId: PERSONAL_USER_ID,
            type: "TEXT_TO_IMAGE",
            prompt: p.prompt,
            negativePrompt: p.negativePrompt,
            model: params.model,
            width: params.width,
            height: params.height,
            status: "PENDING",
            parameters: {
              steps: params.steps,
              cfgScale: params.cfgScale,
              seed: p.seed,
              batchId,
              batchIndex: index,
            },
          },
        })
      )
    );

    // In production, queue all jobs with BullMQ
    // For now, simulate batch processing

    // Update all to processing
    await prisma.generation.updateMany({
      where: {
        id: { in: generations.map((g: { id: string }) => g.id) },
      },
      data: { status: "PROCESSING" },
    });

    return NextResponse.json({
      batchId,
      generations: generations.map((g: { id: string; prompt: string }) => ({
        id: g.id,
        prompt: g.prompt,
        status: "processing",
      })),
      totalCount: batchSize,
      estimatedTime: params.steps <= 4 ? 3 * batchSize : 10 * batchSize,
    });
  } catch (error) {
    console.error("Batch generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get batch status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 }
      );
    }

    // Get all generations in batch
    const generations = await prisma.generation.findMany({
      where: {
        userId: PERSONAL_USER_ID,
        parameters: {
          path: ["batchId"],
          equals: batchId,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        prompt: true,
        status: true,
        imageUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (generations.length === 0) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    const completed = generations.filter((g: { status: string }) => g.status === "COMPLETED").length;
    const failed = generations.filter((g: { status: string }) => g.status === "FAILED").length;
    const processing = generations.filter((g: { status: string }) => g.status === "PROCESSING" || g.status === "PENDING").length;

    return NextResponse.json({
      batchId,
      total: generations.length,
      completed,
      failed,
      processing,
      isComplete: processing === 0,
      generations,
    });
  } catch (error) {
    console.error("Error fetching batch status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
