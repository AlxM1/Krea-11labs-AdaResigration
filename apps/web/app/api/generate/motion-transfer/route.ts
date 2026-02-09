import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PERSONAL_USER_ID = "personal-user";

const motionTransferSchema = z.object({
  motionVideoUrl: z.string(),
  targetImageUrl: z.string(),
  model: z.enum(["animatediff", "svd", "runway"]).default("animatediff"),
  aspectRatio: z.string().default("16:9"),
  duration: z.number().min(2).max(10).default(5),
  motionStrength: z.number().min(0).max(1).default(0.75),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = motionTransferSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Create video generation record
    const video = await prisma.video.create({
      data: {
        userId: PERSONAL_USER_ID,
        type: "MOTION_TRANSFER",
        prompt: `Motion transfer from video to image`,
        model: params.model,
        status: "PROCESSING",
        durationSeconds: params.duration,
        parameters: {
          motionVideoUrl: params.motionVideoUrl,
          targetImageUrl: params.targetImageUrl,
          aspectRatio: params.aspectRatio,
          motionStrength: params.motionStrength,
        },
      },
    });

    // Process motion transfer
    const result = await transferMotion(params);

    if (result.status === "failed") {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Motion transfer failed" },
        { status: 500 }
      );
    }

    // Update video record
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
      },
    });

    return NextResponse.json({
      id: video.id,
      status: result.status,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error) {
    console.error("Motion transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type MotionTransferResult =
  | { status: "completed"; videoUrl: string; thumbnailUrl?: string; error?: never }
  | { status: "failed"; error: string; videoUrl?: never; thumbnailUrl?: never };

/**
 * Transfer motion using provider chain
 * Tries: Replicate AnimateDiff → fal.ai (if available)
 */
async function transferMotion(params: z.infer<typeof motionTransferSchema>): Promise<MotionTransferResult> {
  const attempts: { provider: string; error?: string }[] = [];

  // Try Replicate AnimateDiff first
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log("Trying Replicate AnimateDiff for motion transfer");

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "e7b52e7e5f7e62e1c5e6f0b9f8c7d6e5f7e62e1c5e6f0b9f8c7d6e5f7e62e1c",
          input: {
            motion_video: params.motionVideoUrl,
            image: params.targetImageUrl,
            num_frames: params.duration * 8, // ~8 fps
            motion_scale: params.motionStrength,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate error: ${response.statusText}`);
      }

      const prediction = await response.json();

      // Poll for completion
      let pollAttempts = 0;
      const maxPollAttempts = 120; // 4 minutes max

      while (pollAttempts < maxPollAttempts) {
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
            },
          }
        );

        const statusData = await statusResponse.json();

        if (statusData.status === "succeeded") {
          return {
            status: "completed",
            videoUrl: Array.isArray(statusData.output) ? statusData.output[0] : statusData.output,
            thumbnailUrl: statusData.output?.thumbnail,
          };
        }

        if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(statusData.error || "Prediction failed");
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        pollAttempts++;
      }

      throw new Error("Prediction timed out");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ provider: "Replicate AnimateDiff", error: errorMsg });
      console.error("Replicate AnimateDiff failed:", errorMsg);
    }
  }

  // Try fal.ai as fallback (if they add motion transfer support)
  if (process.env.FAL_KEY) {
    try {
      console.log("Trying fal.ai for motion transfer");

      const response = await fetch("https://fal.run/fal-ai/motion-transfer", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motion_video_url: params.motionVideoUrl,
          target_image_url: params.targetImageUrl,
          num_frames: params.duration * 8,
          motion_strength: params.motionStrength,
        }),
      });

      if (!response.ok) {
        throw new Error(`fal.ai error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: "completed",
        videoUrl: data.video?.url,
        thumbnailUrl: data.thumbnail?.url,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ provider: "fal.ai", error: errorMsg });
      console.error("fal.ai motion transfer failed:", errorMsg);
    }
  }

  // All providers failed
  return {
    status: "failed",
    error: `All motion transfer providers failed. Tried: ${attempts.map(a => a.provider).join(", ")}. Configure REPLICATE_API_TOKEN or FAL_KEY.`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const videos = await prisma.video.findMany({
      where: {
        userId: PERSONAL_USER_ID,
        type: "MOTION_TRANSFER",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: {
        userId: PERSONAL_USER_ID,
        type: "MOTION_TRANSFER",
      },
    });

    return NextResponse.json({ videos, total, limit, offset });
  } catch (error) {
    console.error("Error fetching motion transfer videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
