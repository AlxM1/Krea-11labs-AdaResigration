import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, StyleTransferJob } from "@/lib/queue";
import { z } from "zod";

const styleTransferSchema = z.object({
  contentImageUrl: z.string().url(),
  stylePreset: z.string().optional(),
  styleImageUrl: z.string().url().optional(),
  strength: z.number().min(0.1).max(1.0).default(0.65),
  async: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = styleTransferSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { contentImageUrl, stylePreset, styleImageUrl, strength, async: asyncMode } = validated.data;

    const generation = await prisma.generation.create({
      data: {
        userId,
        type: "IMAGE_TO_IMAGE",
        prompt: stylePreset ? `Style transfer: ${stylePreset}` : "Style transfer",
        model: "flux-dev-i2i",
        status: "PENDING",
        parameters: {
          tool: "style-transfer",
          contentImageUrl,
          stylePreset,
          styleImageUrl,
          strength,
        },
      },
    });

    if (asyncMode && isQueueAvailable()) {
      await addJob<StyleTransferJob>(
        QueueNames.STYLE_TRANSFER,
        { userId, generationId: generation.id, contentImageUrl, stylePreset, styleImageUrl, strength },
        { jobId: `style-${generation.id}` }
      );

      return NextResponse.json({
        id: generation.id,
        status: "queued",
        message: "Style transfer queued. Poll /api/jobs/{id} for status.",
      });
    }

    // Synchronous mode
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING" },
    });

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
    }

    const stylePrompt = stylePreset
      ? `Apply ${stylePreset} art style, artistic transformation`
      : "Apply artistic style transfer";

    const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: contentImageUrl,
        prompt: stylePrompt,
        strength,
        num_inference_steps: 20,
        guidance_scale: 7.5,
      }),
    });

    if (!response.ok) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { error: `Style transfer failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const outputUrl = data.images?.[0]?.url;

    if (!outputUrl) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: "No output image" }, { status: 500 });
    }

    let finalUrl = outputUrl;
    try {
      const uploaded = await uploadFromUrl(outputUrl, userId);
      finalUrl = uploaded.url;
    } catch { /* use provider URL */ }

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
    });

    return NextResponse.json({
      id: generation.id,
      status: "completed",
      imageUrl: finalUrl,
    });
  } catch (error) {
    console.error("Style transfer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
