import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PERSONAL_USER_ID = "personal-user";

const lipsyncSchema = z.object({
  videoUrl: z.string(),
  audioUrl: z.string(),
  model: z.enum(["wav2lip", "sadtalker"]).default("wav2lip"),
  syncStrength: z.number().min(0).max(1).default(0.8),
  expressiveness: z.number().min(0).max(1).default(0.5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = lipsyncSchema.safeParse(body);

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
        type: "LIPSYNC",
        prompt: `Lipsync video with audio`,
        model: params.model,
        status: "PROCESSING",
        parameters: {
          sourceVideoUrl: params.videoUrl,
          audioUrl: params.audioUrl,
          syncStrength: params.syncStrength,
          expressiveness: params.expressiveness,
        },
      },
    });

    // Process lipsync
    const result = await processLipsync(params);

    if (result.status === "failed") {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Lipsync failed" },
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
    console.error("Lipsync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type LipsyncResult =
  | { status: "completed"; videoUrl: string; thumbnailUrl?: string; error?: never }
  | { status: "failed"; error: string; videoUrl?: never; thumbnailUrl?: never };

/**
 * Process lipsync using provider chain
 * Tries: Replicate Wav2Lip → fal.ai (if available)
 */
async function processLipsync(params: z.infer<typeof lipsyncSchema>): Promise<LipsyncResult> {
  const attempts: { provider: string; error?: string }[] = [];

  // Try Replicate Wav2Lip first
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log("Trying Replicate Wav2Lip for lipsync");

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef",
          input: {
            face: params.videoUrl,
            audio: params.audioUrl,
            pads: [0, 10, 0, 0],
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
      attempts.push({ provider: "Replicate Wav2Lip", error: errorMsg });
      console.error("Replicate Wav2Lip failed:", errorMsg);
    }
  }

  // Try fal.ai as fallback (if they add lipsync support)
  if (process.env.FAL_KEY) {
    try {
      console.log("Trying fal.ai for lipsync");

      const response = await fetch("https://fal.run/fal-ai/lipsync", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: params.videoUrl,
          audio_url: params.audioUrl,
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
      console.error("fal.ai lipsync failed:", errorMsg);
    }
  }

  // All providers failed
  return {
    status: "failed",
    error: `All lipsync providers failed. Tried: ${attempts.map(a => a.provider).join(", ")}. Configure REPLICATE_API_TOKEN or FAL_KEY.`,
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
        type: "LIPSYNC",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.video.count({
      where: {
        userId: PERSONAL_USER_ID,
        type: "LIPSYNC",
      },
    });

    return NextResponse.json({ videos, total, limit, offset });
  } catch (error) {
    console.error("Error fetching lipsync videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
