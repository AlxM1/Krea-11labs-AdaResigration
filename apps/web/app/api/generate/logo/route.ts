import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateImage } from "@/lib/ai/providers";
import { uploadFromUrl } from "@/lib/storage/upload";
import { addJob, isQueueAvailable, QueueNames, LogoGenerationJob } from "@/lib/queue";
import { ComfyUIProvider } from "@/lib/ai/comfyui-provider";
import { z } from "zod";

const logoSchema = z.object({
  companyName: z.string().min(1).max(200),
  style: z.enum(["minimalist", "gradient", "3d", "vintage", "modern"]).default("minimalist"),
  colors: z.array(z.string()).max(5).default([]),
  count: z.number().min(1).max(4).default(1),
  async: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const body = await req.json();
    const validated = logoSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { companyName, style, colors, count, async: asyncMode } = validated.data;
    const colorStr = colors.length > 0 ? `, using colors: ${colors.join(", ")}` : "";
    const logoPrompt = `Professional ${style} logo design for "${companyName}"${colorStr}. Clean vector style, centered composition, white background, minimal, high quality logo`;

    const results = [];

    for (let i = 0; i < count; i++) {
      const generation = await prisma.generation.create({
        data: {
          userId,
          type: "TEXT_TO_IMAGE",
          prompt: logoPrompt,
          model: "flux-schnell",
          status: "PENDING",
          parameters: {
            tool: "logo-generation",
            companyName,
            style,
            colors,
            variation: i + 1,
          },
        },
      });

      if (asyncMode && isQueueAvailable()) {
        await addJob<LogoGenerationJob>(
          QueueNames.LOGO_GENERATION,
          { userId, generationId: generation.id, companyName, style, colors },
          { jobId: `logo-${generation.id}` }
        );
        results.push({ id: generation.id, status: "queued" });
        continue;
      }

      // Synchronous generation
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "PROCESSING" },
      });

      // Try ComfyUI if FAL_KEY not available
      let aiResult;
      const falKey = process.env.FAL_KEY;
      if (!falKey || falKey === "") {
        console.log('[Logo] Using ComfyUI (FAL_KEY not configured)');
        const comfyui = new ComfyUIProvider({
          baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
          outputUrl: process.env.COMFYUI_OUTPUT_URL,
          defaultModel: process.env.COMFYUI_DEFAULT_MODEL || "sd_xl_base_1.0.safetensors",
          sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
          fluxModel: process.env.COMFYUI_FLUX_MODEL || "flux1-schnell.safetensors",
        });
        aiResult = await comfyui.generateImage({
          prompt: logoPrompt,
          width: 1024,
          height: 1024,
          steps: 8,
        });
      } else {
        aiResult = await generateImage(
          { prompt: logoPrompt, width: 1024, height: 1024, steps: 8 },
          "fal"
        );
      }

      if (aiResult.status === "failed" || !aiResult.imageUrl) {
        await prisma.generation.update({
          where: { id: generation.id },
          data: { status: "FAILED" },
        });
        results.push({ id: generation.id, status: "failed", error: aiResult.error });
        continue;
      }

      let finalUrl = aiResult.imageUrl;
      try {
        const uploaded = await uploadFromUrl(aiResult.imageUrl, userId);
        finalUrl = uploaded.url;
      } catch { /* use provider URL */ }

      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
      });

      results.push({ id: generation.id, status: "completed", imageUrl: finalUrl });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Logo generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
