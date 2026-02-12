import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { uploadFromUrl } from "@/lib/storage/upload";
import { ComfyUIProvider } from "@/lib/ai/comfyui-provider";
import { OllamaProvider, checkOllamaHealth } from "@/lib/ai/ollama-provider";
import { z } from "zod";

const logoSchema = z.object({
  companyName: z.string().min(1).max(200),
  style: z.enum(["minimalist", "gradient", "3d", "vintage", "modern"]).default("minimalist"),
  colors: z.array(z.string()).max(5).default([]),
  count: z.number().min(1).max(16).default(4),
  async: z.boolean().default(false),
});

// 16 distinct style modifiers for logo variations
const STYLE_MODIFIERS = [
  "minimalist",
  "bold",
  "vintage",
  "modern",
  "geometric",
  "hand-drawn",
  "gradient",
  "monochrome",
  "emblem",
  "wordmark",
  "mascot",
  "abstract",
  "line art",
  "3D",
  "flat design",
  "luxurious",
];

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

    const { companyName, style, colors, count } = validated.data;
    const colorStr = colors.length > 0 ? `, using colors: ${colors.join(", ")}` : "";

    // Enhance base prompt via Ollama LLM if available (once, then append modifiers per variation)
    let baseDescription = "";
    try {
      if (await checkOllamaHealth()) {
        console.log("[Logo] Enhancing prompt via Ollama...");
        const ollama = new OllamaProvider();
        const enhanced = await ollama.generate(
          `Create a brief visual description for a ${style} logo for the company "${companyName}"${colorStr}. Describe the iconography, shapes, and composition in 1-2 sentences. Output ONLY the description.`,
          {
            system: `You are a logo design expert. Output a concise visual description (1-2 sentences) of what the logo should look like. Focus on icon shape, composition, and feel. Do not include style words like "minimalist" or "vintage" - those will be added separately.`,
            temperature: 0.9,
            maxTokens: 100,
          }
        );
        if (enhanced && enhanced.trim().length > 10) {
          baseDescription = enhanced.trim();
          console.log("[Logo] Ollama enhanced description:", baseDescription);
        }
      }
    } catch (err) {
      console.warn("[Logo] Ollama enhancement failed:", err);
    }

    // Set up ComfyUI
    const comfyuiUrl = process.env.COMFYUI_URL || (process.env.COMFYUI_HOST ? `http://${process.env.COMFYUI_HOST}:${process.env.COMFYUI_PORT || "8188"}` : "");
    if (!comfyuiUrl) {
      return NextResponse.json(
        { error: "ComfyUI not configured. Local GPU required for logo generation." },
        { status: 503 }
      );
    }

    const comfyui = new ComfyUIProvider({
      baseUrl: comfyuiUrl,
    });

    // Stream results as NDJSON so each logo appears immediately on the frontend.
    // This avoids HTTP timeout issues for large batches (16 logos × ~20-30s each = 5-8 min).
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < count; i++) {
          const styleModifier = STYLE_MODIFIERS[i % STYLE_MODIFIERS.length];

          const logoPrompt = baseDescription
            ? `professional logo design, ${styleModifier}, ${baseDescription}${colorStr}, white background, vector style, clean lines, centered composition, no text`
            : `professional logo design, ${styleModifier}, for "${companyName}"${colorStr}, white background, vector style, clean lines, centered composition, no text`;

          const generation = await prisma.generation.create({
            data: {
              userId,
              type: "TEXT_TO_IMAGE",
              prompt: logoPrompt,
              model: "comfyui-flux",
              status: "PENDING",
              parameters: {
                tool: "logo-generation",
                companyName,
                style,
                styleModifier,
                colors,
                variation: i + 1,
              },
            },
          });

          await prisma.generation.update({
            where: { id: generation.id },
            data: { status: "PROCESSING" },
          });

          try {
            console.log(`[Logo] Generating variation ${i + 1}/${count}: ${styleModifier}`);

            const aiResult = await comfyui.generateImage({
              prompt: logoPrompt,
              negativePrompt: "text, words, letters, watermark, signature, blurry, low quality, distorted",
              width: 1024,
              height: 1024,
              steps: 20,
              seed: -1,
            });

            if (aiResult.status === "failed" || !aiResult.imageUrl) {
              await prisma.generation.update({
                where: { id: generation.id },
                data: { status: "FAILED" },
              });
              controller.enqueue(encoder.encode(
                JSON.stringify({ id: generation.id, status: "failed", error: aiResult.error, styleModifier }) + "\n"
              ));
              continue;
            }

            // Download from ComfyUI internal URL and save to local storage
            let finalUrl: string | null = null;
            try {
              const uploaded = await uploadFromUrl(aiResult.imageUrl, userId);
              finalUrl = uploaded.url;
            } catch (uploadErr) {
              console.error(`[Logo] Failed to upload variation ${i + 1} to local storage:`, uploadErr);
              await prisma.generation.update({
                where: { id: generation.id },
                data: { status: "FAILED" },
              });
              controller.enqueue(encoder.encode(
                JSON.stringify({ id: generation.id, status: "failed", error: "Failed to save generated image", styleModifier }) + "\n"
              ));
              continue;
            }

            await prisma.generation.update({
              where: { id: generation.id },
              data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
            });

            controller.enqueue(encoder.encode(
              JSON.stringify({ id: generation.id, status: "completed", imageUrl: finalUrl, styleModifier }) + "\n"
            ));
          } catch (error) {
            console.error(`[Logo] Variation ${i + 1} failed:`, error);
            await prisma.generation.update({
              where: { id: generation.id },
              data: { status: "FAILED" },
            });
            controller.enqueue(encoder.encode(
              JSON.stringify({
                id: generation.id,
                status: "failed",
                error: error instanceof Error ? error.message : "Generation failed",
                styleModifier,
              }) + "\n"
            ));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Logo generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
