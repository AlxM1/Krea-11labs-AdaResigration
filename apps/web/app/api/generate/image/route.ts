import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImage, AIProvider, enhancePrompt, generateNegativePrompt } from "@/lib/ai/providers";
import { uploadFromUrl } from "@/lib/storage/upload";
import { rateLimit, rateLimitConfigs, rateLimitResponse, getClientIdentifier } from "@/lib/rate-limit";
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
  // Provider selection
  provider: z.enum(["fal", "replicate", "together", "comfyui"]).optional(),
  // Prompt enhancement options
  enhancePrompt: z.boolean().default(false),
  autoNegative: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(req, session.user.id);
    const rateLimitResult = rateLimit(identifier, rateLimitConfigs.generation);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
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

    // Apply prompt enhancement if requested (using local Ollama)
    let finalPrompt = params.prompt;
    let finalNegativePrompt = params.negativePrompt;

    if (params.enhancePrompt) {
      try {
        finalPrompt = await enhancePrompt(params.prompt);
      } catch (error) {
        console.warn("Prompt enhancement failed, using original:", error);
      }
    }

    if (params.autoNegative && !finalNegativePrompt) {
      try {
        finalNegativePrompt = await generateNegativePrompt(finalPrompt);
      } catch (error) {
        console.warn("Negative prompt generation failed:", error);
      }
    }

    // Determine provider (defaults to fal for cloud, comfyui for local)
    const provider: AIProvider = params.provider || "fal";

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        type: "TEXT_TO_IMAGE",
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        model: params.model,
        width: params.width,
        height: params.height,
        status: "PROCESSING",
        parameters: {
          steps: params.steps,
          cfgScale: params.cfgScale,
          seed: params.seed,
          batchSize: params.batchSize,
          provider: provider,
          originalPrompt: params.enhancePrompt ? params.prompt : undefined,
        },
      },
    });

    // Call AI provider
    const aiResponse = await generateImage(
      {
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        width: params.width,
        height: params.height,
        steps: params.steps,
        cfgScale: params.cfgScale,
        seed: params.seed > 0 ? params.seed : undefined,
        model: params.model,
      },
      provider
    );

    if (aiResponse.status === "failed" || !aiResponse.imageUrl) {
      // Update generation as failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          parameters: {
            ...(generation.parameters as object),
            error: aiResponse.error || "Generation failed",
          },
        },
      });

      return NextResponse.json(
        { error: aiResponse.error || "Generation failed", id: generation.id },
        { status: 500 }
      );
    }

    // Upload generated image to storage (optional - can also use provider URL directly)
    let finalImageUrl = aiResponse.imageUrl;
    try {
      const uploadResult = await uploadFromUrl(aiResponse.imageUrl, session.user.id);
      finalImageUrl = uploadResult.url;
    } catch (uploadError) {
      // If upload fails, use the original URL
      console.error("Failed to upload to storage, using provider URL:", uploadError);
    }

    // Update generation record with result
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        imageUrl: finalImageUrl,
        thumbnailUrl: finalImageUrl, // Could generate a thumbnail separately
        seed: aiResponse.seed ? BigInt(aiResponse.seed) : null,
      },
    });

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { creditsRemaining: { decrement: creditsNeeded } },
    });

    // Log usage
    await prisma.usageLog.create({
      data: {
        userId: session.user.id,
        actionType: "IMAGE_GENERATION",
        creditsUsed: creditsNeeded,
        metadata: {
          generationId: generation.id,
          model: params.model,
          steps: params.steps,
        },
      },
    });

    return NextResponse.json({
      id: generation.id,
      status: "completed",
      imageUrl: finalImageUrl,
      seed: aiResponse.seed,
      creditsUsed: creditsNeeded,
      provider: provider,
      prompt: finalPrompt,
      enhancedPrompt: params.enhancePrompt && finalPrompt !== params.prompt,
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
