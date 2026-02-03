import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().max(1000).optional(),
  model: z.string().default("flux-schnell"),
  width: z.number().min(256).max(2048).default(1024),
  height: z.number().min(256).max(2048).default(1024),
  steps: z.number().min(1).max(100).default(4),
  cfgScale: z.number().min(1).max(20).default(7.5),
  seed: z.number().default(-1),
  batchSize: z.number().min(1).max(4).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = generateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditsRemaining: true, subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const creditsNeeded = params.batchSize;
    if (user.creditsRemaining < creditsNeeded) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsRemaining: user.creditsRemaining },
        { status: 402 }
      );
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        type: "TEXT_TO_IMAGE",
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model,
        width: params.width,
        height: params.height,
        status: "PENDING",
        parameters: {
          steps: params.steps,
          cfgScale: params.cfgScale,
          seed: params.seed,
          batchSize: params.batchSize,
        },
      },
    });

    // In production, this would call an AI inference API (fal.ai, Replicate, etc.)
    // For now, we'll simulate the generation with a placeholder

    // Simulate API call to AI provider
    // const aiResponse = await fetch("https://api.fal.ai/...", { ... });

    // For demo purposes, return a placeholder response
    // In production, you would:
    // 1. Queue the job with BullMQ
    // 2. Call the AI inference API
    // 3. Upload the result to storage
    // 4. Update the generation record
    // 5. Deduct credits

    // Simulate processing
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING" },
    });

    // In a real implementation, this would be handled by a background worker
    // For now, return the pending generation
    return NextResponse.json({
      id: generation.id,
      status: "processing",
      message: "Generation started. Poll /api/generate/image/:id for status.",
      estimatedTime: params.steps <= 4 ? 3 : 10,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const generations = await prisma.generation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        prompt: true,
        model: true,
        status: true,
        imageUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    const total = await prisma.generation.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      generations,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
