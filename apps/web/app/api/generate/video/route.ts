import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateVideo, AIProvider } from "@/lib/ai/providers";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, VideoGenerationJob } from "@/lib/queue";
import { z } from "zod";
import { randomUUID } from "crypto";

const videoGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().default("svd"), // Default to SVD (Stable Video Diffusion) - confirmed working
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

    // Check provider availability (fal.ai credits exhausted, need ComfyUI or alternative)
    const comfyuiAvailable = !!process.env.COMFYUI_URL;
    const falAvailable = !!process.env.FAL_KEY;
    const googleAvailable = !!process.env.GOOGLE_AI_API_KEY;

    // Determine provider based on model and availability
    let provider: AIProvider;
    if (params.provider) {
      provider = params.provider;
    } else if (params.model.toLowerCase().includes("svd") || params.model.toLowerCase().includes("cogvideo") || params.model.toLowerCase().includes("wan")) {
      // SVD, CogVideo, and Wan models always use ComfyUI (local GPU)
      if (!comfyuiAvailable) {
        return NextResponse.json(
          {
            error: "ComfyUI not available",
            message: "Local GPU video generation requires ComfyUI.\nConfigure COMFYUI_URL environment variable.",
          },
          { status: 503 }
        );
      }
      provider = "comfyui";
    } else if (comfyuiAvailable) {
      provider = "comfyui"; // Prefer local GPU (free)
    } else if (googleAvailable) {
      provider = "google"; // Google Veo 3.1
    } else if (falAvailable) {
      provider = "fal"; // fal.ai (credits may be exhausted)
    } else {
      return NextResponse.json(
        {
          error: "No video generation providers available",
          message: "Video generation requires either:\n1. ComfyUI with AnimateDiff/SVD models (local GPU)\n2. Google AI API key (Veo 3.1)\n3. fal.ai API key (credits required)\n\nConfigure at least one provider in your environment variables.",
          providers: {
            comfyui: comfyuiAvailable ? "available" : "not configured",
            google: googleAvailable ? "available" : "not configured",
            fal: falAvailable ? "configured (credits may be exhausted)" : "not configured",
          }
        },
        { status: 503 }
      );
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

    // Synchronous fallback: generate directly with timeout
    // SVD text-to-video involves two stages (image gen + SVD), each ~72s, plus model loading
    const timeoutMs = 600000; // 600 seconds (10 minutes) timeout for video generation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Video generation timed out after 600 seconds")), timeoutMs)
    );

    const result = await Promise.race([
      generateVideo(
        {
          prompt: params.prompt,
          imageUrl: params.imageUrl,
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          model: params.model,
        },
        provider
      ),
      timeoutPromise,
    ]).catch((error) => {
      console.error("Video generation failed or timed out:", error);
      return {
        id: crypto.randomUUID(),
        status: "failed" as const,
        error: error.message || "Video generation timed out",
      };
    });

    if (result.status === "failed") {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Video generation failed" },
        { status: 500 }
      );
    }

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
      provider: provider,
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
