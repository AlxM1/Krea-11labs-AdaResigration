import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai/providers";
import { z } from "zod";

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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditsRemaining: true, subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check tier allows batch generation
    const allowedTiers = ["PRO", "MAX", "TEAM", "ENTERPRISE"];
    if (!allowedTiers.includes(user.subscriptionTier)) {
      return NextResponse.json(
        { error: "Batch generation requires PRO subscription or higher" },
        { status: 403 }
      );
    }

    if (user.creditsRemaining < batchSize) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          creditsRequired: batchSize,
          creditsRemaining: user.creditsRemaining
        },
        { status: 402 }
      );
    }

    // Create batch job record
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create generation records for each prompt
    const generations = await Promise.all(
      params.prompts.map((p, index) =>
        prisma.generation.create({
          data: {
            userId: session.user.id,
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
        id: { in: generations.map(g => g.id) },
      },
      data: { status: "PROCESSING" },
    });

    // Reserve credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { creditsRemaining: { decrement: batchSize } },
    });

    // Log usage
    await prisma.usageLog.create({
      data: {
        userId: session.user.id,
        actionType: "BATCH_GENERATION",
        creditsUsed: batchSize,
        metadata: {
          batchId,
          count: batchSize,
          model: params.model,
        },
      },
    });

    return NextResponse.json({
      batchId,
      generations: generations.map(g => ({
        id: g.id,
        prompt: g.prompt,
        status: "processing",
      })),
      totalCredits: batchSize,
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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        userId: session.user.id,
        parameters: {
          path: ["batchId"],
          equals: batchId,
        },
      },
      orderBy: {
        parameters: {
          // @ts-expect-error - Prisma JSON sorting
          path: ["batchIndex"],
          sort: "asc",
        },
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

    const completed = generations.filter(g => g.status === "COMPLETED").length;
    const failed = generations.filter(g => g.status === "FAILED").length;
    const processing = generations.filter(g => g.status === "PROCESSING" || g.status === "PENDING").length;

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
