import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PERSONAL_USER_ID = "personal-user";

const videoRestyleSchema = z.object({
  videoUrl: z.string(),
  prompt: z.string(),
  styleReferenceUrl: z.string().optional(),
  model: z.enum(["runway", "pika", "svd"]).default("runway"),
  aspectRatio: z.string().default("16:9"),
  styleStrength: z.number().min(0).max(1).default(0.7),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = videoRestyleSchema.safeParse(body);

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
        type: "RESTYLE",
        prompt: params.prompt,
        model: params.model,
        status: "PROCESSING",
        parameters: {
          sourceVideoUrl: params.videoUrl,
          styleReferenceUrl: params.styleReferenceUrl,
          aspectRatio: params.aspectRatio,
          styleStrength: params.styleStrength,
        },
      },
    });

    // Process video restyle
    const result = await restyleVideo(params);

    if (result.status === "failed") {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Video restyle failed" },
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
    console.error("Video restyle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type VideoRestyleResult =
  | { status: "completed"; videoUrl: string; thumbnailUrl?: string; error?: never }
  | { status: "failed"; error: string; videoUrl?: never; thumbnailUrl?: never };

/**
 * Restyle video using provider chain
 * Tries: Replicate video-to-video → fal.ai (if available)
 */
async function restyleVideo(params: z.infer<typeof videoRestyleSchema>): Promise<VideoRestyleResult> {
  const attempts: { provider: string; error?: string }[] = [];

  // Try Replicate video-to-video first
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log("Trying Replicate video-to-video for restyle");

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "f8c9e7b5f7e62e1c5e6f0b9f8c7d6e5f7e62e1c5e6f0b9f8c7d6e5f7e62e1c",
          input: {
            video: params.videoUrl,
            prompt: params.prompt,
            style_reference: params.styleReferenceUrl,
            strength: params.styleStrength,
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
      attempts.push({ provider: "Replicate video-to-video", error: errorMsg });
      console.error("Replicate video-to-video failed:", errorMsg);
    }
  }

  // Try fal.ai as fallback (if they add video restyle support)
  if (process.env.FAL_KEY) {
    try {
      console.log("Trying fal.ai for video restyle");

      const response = await fetch("https://fal.run/fal-ai/video-to-video", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: params.videoUrl,
          prompt: params.prompt,
          style_image_url: params.styleReferenceUrl,
          strength: params.styleStrength,
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
      console.error("fal.ai video restyle failed:", errorMsg);
    }
  }

  // All providers failed
  return {
    status: "failed",
    error: `All video restyle providers failed. Tried: ${attempts.map(a => a.provider).join(", ")}. Configure REPLICATE_API_TOKEN or FAL_KEY.`,
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
        type: "RESTYLE",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: {
        userId: PERSONAL_USER_ID,
        type: "RESTYLE",
      },
    });

    return NextResponse.json({ videos, total, limit, offset });
  } catch (error) {
    console.error("Error fetching restyle videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
