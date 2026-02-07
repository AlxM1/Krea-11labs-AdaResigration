import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateVideo, AIProvider } from "@/lib/ai/providers";
import { z } from "zod";

// Default user ID for personal use (no auth required)
const PERSONAL_USER_ID = "personal-user";

const videoGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().default("kling-2.5"),
  duration: z.number().min(2).max(10).default(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  // Provider selection (google for Veo 3.1, fal for Runway, comfyui for local SVD)
  provider: z.enum(["fal", "google", "comfyui"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = videoGenerateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Determine provider (defaults to fal, use google for Veo 3.1)
    const provider: AIProvider = params.provider || "fal";

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: PERSONAL_USER_ID,
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

    // Generate video (in production, queue this with BullMQ)
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

    // Upload to storage if we have a result
    const videoUrl = result.videoUrl;

    // Update video record
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl,
      },
    });

    return NextResponse.json({
      id: video.id,
      status: result.status,
      videoUrl,
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
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const videos = await prisma.video.findMany({
      where: { userId: PERSONAL_USER_ID },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: { userId: PERSONAL_USER_ID },
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
