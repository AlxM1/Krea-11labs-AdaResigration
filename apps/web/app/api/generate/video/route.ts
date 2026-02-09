import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateVideo, AIProvider } from "@/lib/ai/providers";
import { addJob, isQueueAvailable, QueueNames, VideoGenerationJob } from "@/lib/queue";
import { z } from "zod";

const videoGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().default("kling-2.5"),
  duration: z.number().min(2).max(10).default(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  // Provider selection (google for Veo 3.1, fal for Runway, comfyui for local SVD)
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
    const provider: AIProvider = params.provider || "fal";

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

    // Synchronous fallback: generate directly
    const result = await generateVideo(
      {
        prompt: params.prompt,
        imageUrl: params.imageUrl,
        duration: params.duration,
        aspectRatio: params.aspectRatio,
        model: params.model,
      },
      provider
    );

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

    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl: result.videoUrl,
      },
    });

    return NextResponse.json({
      id: video.id,
      status: result.status,
      videoUrl: result.videoUrl,
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
