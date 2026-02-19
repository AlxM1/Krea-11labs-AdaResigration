import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateVideo, AIProvider, VideoGenerationRequest } from "@/lib/ai/providers";
import { executeVideoChain } from "@/lib/ai/provider-chain";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, VideoGenerationJob } from "@/lib/queue";
import { z } from "zod";
import { randomUUID } from "crypto";

const videoGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().default("wan-t2v"), // Default to Wan 2.2 MoE (highest quality), falls back to SVD
  duration: z.number().min(2).max(10).default(6),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  // Provider selection (google for Veo 3.1, fal for Runway, comfyui for Wan/CogVideo/SVD)
  provider: z.enum(["fal", "google", "comfyui", "replicate"]).optional(),
  // If true, queue the job and return immediately
  async: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = videoGenerateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Determine provider for initial record (the chain will handle failover automatically)
    let provider: AIProvider;
    if (params.provider) {
      provider = params.provider;
    } else if (params.model.toLowerCase().includes("svd") || params.model.toLowerCase().includes("cogvideo") || params.model.toLowerCase().includes("wan")) {
      provider = "comfyui"; // These models prefer ComfyUI; chain will failover if unavailable
    } else if (process.env.COMFYUI_URL) {
      provider = "comfyui";
    } else if (process.env.GOOGLE_AI_API_KEY) {
      provider = "google";
    } else if (process.env.FAL_KEY) {
      provider = "fal";
    } else {
      provider = "fal"; // Default; chain will report proper error if nothing is available
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: userId,
        type: params.imageUrl ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO",
        prompt: params.prompt,
        model: params.model,
        status: "PENDING",
        parameters: {
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          provider: provider,
        },
      },
    });

    // Try to queue the job if Redis is available and async mode is on
    if (params.async && isQueueAvailable()) {
      const job = await addJob<VideoGenerationJob & { provider: AIProvider }>(
        QueueNames.VIDEO_GENERATION,
        {
          userId: userId,
          videoId: video.id,
          prompt: params.prompt,
          imageUrl: params.imageUrl,
          model: params.model,
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          provider,
        },
        { jobId: `video-${video.id}` }
      );

      return NextResponse.json({
        id: video.id,
        status: "queued",
        jobId: job?.id,
        provider: provider,
        message: "Video generation queued. Poll /api/jobs/{id} for status.",
      });
    }

    // Synchronous fallback: use provider chain with automatic failover
    const videoRequest: VideoGenerationRequest = {
      prompt: params.prompt,
      imageUrl: params.imageUrl,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      model: params.model,
    };

    const chainResult = await executeVideoChain(
      videoRequest,
      async (chainProvider, chainRequest) => {
        // Wrap with timeout per provider attempt
        const timeoutMs = 2400000; // 40 minutes (Wan 2.2 14B MoE needs ~25min)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Video generation timed out after 2400 seconds")), timeoutMs)
        );
        return Promise.race([
          generateVideo(chainRequest, chainProvider),
          timeoutPromise,
        ]);
      }
    );

    // Log failover attempts for observability
    if (chainResult.attempts.length > 1) {
      console.log(
        `[Failover] Video generation required ${chainResult.attempts.length} attempts:`,
        chainResult.attempts.map(a => `${a.provider}(${a.success ? 'ok' : 'fail'}${a.duration ? ` ${a.duration}ms` : ''}${a.error ? `: ${a.error}` : ''})`).join(' → ')
      );
    }

    const result = chainResult.result as import("@/lib/ai/providers").VideoGenerationResponse | undefined;

    if (!chainResult.success || !result) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: "FAILED",
          parameters: {
            ...(video.parameters as object || {}),
            failoverAttempts: chainResult.attempts.map(a => ({ provider: a.provider, success: a.success, error: a.error, duration: a.duration })),
          },
        },
      });

      return NextResponse.json(
        { error: chainResult.finalError || "Video generation failed" },
        { status: 500 }
      );
    }

    const successfulProvider = chainResult.attempts.find(a => a.success)?.provider || provider;

    // If the video URL is from ComfyUI (internal), it's already been saved to local storage
    // by the provider. For external URLs, try to save to local storage.
    let finalVideoUrl = result.videoUrl;
    if (result.videoUrl && !result.videoUrl.startsWith("/api/uploads/")) {
      try {
        const uploaded = await uploadFromUrl(result.videoUrl, userId);
        finalVideoUrl = uploaded.url;
      } catch {
        // Use the provider URL if upload fails
        finalVideoUrl = result.videoUrl;
      }
    }

    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl: finalVideoUrl,
      },
    });

    return NextResponse.json({
      id: video.id,
      status: result.status,
      videoUrl: finalVideoUrl,
      provider: successfulProvider,
      failover: chainResult.attempts.length > 1 ? {
        attempts: chainResult.attempts.map(a => ({ provider: a.provider, success: a.success, duration: a.duration })),
      } : undefined,
    });
  } catch (error) {
    console.error("Video generation error:", error);
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

    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: { userId },
    });

    return NextResponse.json({ videos, total, limit, offset });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
