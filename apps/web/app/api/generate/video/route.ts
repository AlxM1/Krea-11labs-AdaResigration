import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateVideo } from "@/lib/ai/providers";
import { uploadFromUrl } from "@/lib/storage/upload";
import { z } from "zod";

const videoGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().default("kling-2.5"),
  duration: z.number().min(2).max(10).default(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = videoGenerateSchema.safeParse(body);

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
      select: { creditsRemaining: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const creditsNeeded = params.duration; // 1 credit per second
    if (user.creditsRemaining < creditsNeeded) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsRemaining: user.creditsRemaining },
        { status: 402 }
      );
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: session.user.id,
        type: params.imageUrl ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO",
        prompt: params.prompt,
        model: params.model,
        status: "PENDING",
        parameters: {
          duration: params.duration,
          aspectRatio: params.aspectRatio,
        },
      },
    });

    // Generate video (in production, queue this with BullMQ)
    const result = await generateVideo({
      prompt: params.prompt,
      imageUrl: params.imageUrl,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      model: params.model,
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

    // Upload to storage if we have a result
    let videoUrl = result.videoUrl;
    if (result.videoUrl) {
      // In production, copy to our storage
      // const uploaded = await uploadFromUrl(result.videoUrl, session.user.id);
      // videoUrl = uploaded.url;
    }

    // Update video record
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl,
      },
    });

    // Deduct credits
    if (result.status === "completed") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { creditsRemaining: { decrement: creditsNeeded } },
      });
    }

    return NextResponse.json({
      id: video.id,
      status: result.status,
      videoUrl,
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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const videos = await prisma.video.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: { userId: session.user.id },
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
