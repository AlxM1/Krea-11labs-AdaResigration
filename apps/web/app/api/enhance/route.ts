import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { upscaleImage, enhanceFaces } from "@/lib/ai/enhance";
import { uploadFromUrl } from "@/lib/storage/upload";
import { z } from "zod";

const enhanceSchema = z.object({
  imageUrl: z.string().url(),
  scale: z.enum(["1", "2", "4", "8"]).default("2"),
  model: z.enum(["real-esrgan", "gfpgan", "codeformer", "krya-enhance"]).default("krya-enhance"),
  denoise: z.number().min(0).max(100).default(50),
  faceEnhance: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = enhanceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: userId,
        type: "UPSCALE",
        prompt: `Upscale ${params.scale}x with ${params.model}`,
        model: params.model,
        status: "PROCESSING",
        parameters: {
          scale: params.scale,
          denoise: params.denoise,
          faceEnhance: params.faceEnhance,
          originalUrl: params.imageUrl,
        },
      },
    });

    let result;

    // Choose enhancement method based on model
    if (params.model === "gfpgan" || params.model === "codeformer") {
      result = await enhanceFaces(params.imageUrl);
    } else {
      result = await upscaleImage({
        imageUrl: params.imageUrl,
        scale: parseInt(params.scale) as 1 | 2 | 4 | 8,
        model: params.model,
        denoise: params.denoise,
        faceEnhance: params.faceEnhance,
      });
    }

    if (result.status === "failed") {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Enhancement failed" },
        { status: 500 }
      );
    }

    // Upload result to our storage
    let finalUrl = result.imageUrl;
    if (result.imageUrl) {
      try {
        const uploaded = await uploadFromUrl(result.imageUrl, userId);
        finalUrl = uploaded.url;
      } catch {
        // Use original URL if upload fails
        finalUrl = result.imageUrl;
      }
    }

    // Update generation record
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        imageUrl: finalUrl,
        width: result.enhancedSize?.width,
        height: result.enhancedSize?.height,
      },
    });

    return NextResponse.json({
      id: generation.id,
      status: "completed",
      imageUrl: finalUrl,
      enhancedSize: result.enhancedSize,
    });
  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
