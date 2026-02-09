import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, BackgroundRemovalJob } from "@/lib/queue";
import { z } from "zod";

const bgRemovalSchema = z.object({
  imageUrl: z.string().url(),
  async: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = bgRemovalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { imageUrl, async: asyncMode } = validated.data;

    const generation = await prisma.generation.create({
      data: {
        userId,
        type: "EDIT",
        prompt: "Background removal",
        model: "birefnet",
        status: "PENDING",
        parameters: { tool: "background-removal", originalUrl: imageUrl },
      },
    });

    if (asyncMode && isQueueAvailable()) {
      await addJob<BackgroundRemovalJob>(
        QueueNames.BACKGROUND_REMOVAL,
        { userId, generationId: generation.id, imageUrl },
        { jobId: `bgr-${generation.id}` }
      );

      return NextResponse.json({
        id: generation.id,
        status: "queued",
        message: "Background removal queued. Poll /api/jobs/{id} for status.",
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

    const response = await fetch("https://fal.run/fal-ai/birefnet", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        model: "General Use (Heavy)",
        operating_resolution: "1024x1024",
      }),
    });

    if (!response.ok) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { error: `Background removal failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const outputUrl = data.image?.url;

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
    } catch {
      // Use provider URL directly
    }

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
    console.error("Background removal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
