import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateImage, AIProvider, enhancePrompt, generateNegativePrompt, GenerationRequest } from "@/lib/ai/providers";
import { executeImageChain } from "@/lib/ai/provider-chain";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, ImageGenerationJob } from "@/lib/queue";
import { z } from "zod";
import { getModelById } from "@/lib/ai/model-registry";
import { MODEL_ID_TO_CHECKPOINT } from "@/lib/ai-models";

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().max(1000).optional(),
  model: z.string().default("flux-fp8"),
  width: z.number().min(256).max(2048).default(1024),
  height: z.number().min(256).max(2048).default(1024),
  steps: z.number().min(1).max(100).default(4),
  cfgScale: z.number().min(1).max(20).default(7.5),
  seed: z.number().default(-1),
  batchSize: z.number().min(1).max(16).default(1),
  // Provider selection
  provider: z.enum(["fal", "replicate", "together", "google", "comfyui"]).optional(),
  // Prompt enhancement options
  enhancePrompt: z.boolean().default(false),
  autoNegative: z.boolean().default(false),
  // If true, queue the job and return immediately (useful for slow providers)
  async: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = generateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

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

    // Determine provider based on model selection or explicit provider param
    let provider: AIProvider;
    let actualModel = params.model;

    // Try registry lookup first, then static map, then legacy logic
    const registryModel = getModelById(params.model);
    const staticEntry = MODEL_ID_TO_CHECKPOINT[params.model];

    if (registryModel && registryModel.provider === "comfyui") {
      provider = "comfyui";
      actualModel = registryModel.filename;
    } else if (staticEntry) {
      provider = "comfyui";
      actualModel = staticEntry.filename;
    } else if (params.model.startsWith("comfyui-")) {
      provider = "comfyui";
      actualModel = params.model.replace("comfyui-", "");
    } else {
      // Default to fal.ai for all cloud models (fallback provider)
      provider = params.provider || "fal";
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: userId,
        type: "TEXT_TO_IMAGE",
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        model: params.model,
        width: params.width,
        height: params.height,
        status: "PENDING",
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

    // Queue the job if async mode and Redis available
    if (params.async && isQueueAvailable()) {
      const job = await addJob<ImageGenerationJob & { provider: AIProvider }>(
        QueueNames.IMAGE_GENERATION,
        {
          userId: userId,
          generationId: generation.id,
          prompt: finalPrompt,
          negativePrompt: finalNegativePrompt,
          model: actualModel,
          width: params.width,
          height: params.height,
          steps: params.steps,
          cfgScale: params.cfgScale,
          seed: params.seed > 0 ? params.seed : undefined,
          batchSize: params.batchSize,
          provider,
        },
        { jobId: `img-${generation.id}` }
      );

      return NextResponse.json({
        id: generation.id,
        status: "queued",
        jobId: job?.id,
        provider: provider,
        prompt: finalPrompt,
        message: "Image generation queued. Poll /api/jobs/{jobId} for status.",
      });
    }

    // Synchronous generation (default for fast providers like fal.ai)
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING" },
    });

    // Determine feature type for the provider chain
    const chainFeature = params.model?.includes("img2img") ? "image-to-image" : "text-to-image";

    const genRequest: GenerationRequest = {
      prompt: finalPrompt,
      negativePrompt: finalNegativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfgScale: params.cfgScale,
      seed: params.seed > 0 ? params.seed : undefined,
      model: actualModel,
      batchSize: params.batchSize,
    };

    // Use provider chain for automatic failover across providers
    // If an explicit provider was requested (and it's not the default), try it first directly
    // then fall back to the chain if it fails
    const chainResult = await executeImageChain(
      chainFeature,
      genRequest,
      async (chainProvider, chainRequest) => {
        return generateImage(chainRequest, chainProvider);
      }
    );

    // Log failover attempts for observability
    if (chainResult.attempts.length > 1) {
      console.log(
        `[Failover] Image generation required ${chainResult.attempts.length} attempts:`,
        chainResult.attempts.map(a => `${a.provider}(${a.success ? 'ok' : 'fail'}${a.duration ? ` ${a.duration}ms` : ''}${a.error ? `: ${a.error}` : ''})`).join(' → ')
      );
    }

    const aiResponse = chainResult.result as import("@/lib/ai/providers").GenerationResponse | undefined;

    if (!chainResult.success || !aiResponse || (aiResponse.status === "failed") || !aiResponse.imageUrl) {
      // Update generation as failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          parameters: {
            ...(generation.parameters as object),
            error: chainResult.finalError || aiResponse?.error || "Generation failed",
            failoverAttempts: chainResult.attempts.map(a => ({ provider: a.provider, success: a.success, error: a.error, duration: a.duration })),
          },
        },
      });

      return NextResponse.json(
        { error: chainResult.finalError || aiResponse?.error || "Generation failed", id: generation.id },
        { status: 500 }
      );
    }

    // Track which provider actually succeeded
    const successfulProvider = chainResult.attempts.find(a => a.success)?.provider || provider;

    // Upload generated images to storage (handles batch generation)
    const imageUrls = aiResponse.images || [aiResponse.imageUrl];
    const finalImageUrls: string[] = [];

    for (const imageUrl of imageUrls) {
      if (!imageUrl) continue;
      try {
        const uploadResult = await uploadFromUrl(imageUrl, userId);
        finalImageUrls.push(uploadResult.url);
      } catch (uploadError) {
        // If upload fails, use the original URL
        console.error("Failed to upload to storage, using provider URL:", uploadError);
        finalImageUrls.push(imageUrl);
      }
    }

    const primaryImageUrl = finalImageUrls[0] || aiResponse.imageUrl;

    // Update generation record with result
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        imageUrl: primaryImageUrl,
        thumbnailUrl: primaryImageUrl,
        seed: aiResponse.seed ? BigInt(aiResponse.seed) : null,
        parameters: {
          ...(generation.parameters as object),
          allImages: finalImageUrls, // Store all batch images
        },
      },
    });

    return NextResponse.json({
      id: generation.id,
      status: "completed",
      imageUrl: primaryImageUrl,
      images: finalImageUrls, // Return all batch images
      seed: aiResponse.seed,
      provider: successfulProvider,
      prompt: finalPrompt,
      enhancedPrompt: params.enhancePrompt && finalPrompt !== params.prompt,
      failover: chainResult.attempts.length > 1 ? {
        attempts: chainResult.attempts.map(a => ({ provider: a.provider, success: a.success, duration: a.duration })),
      } : undefined,
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
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const generations = await prisma.generation.findMany({
      where: { userId },
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
      where: { userId },
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
