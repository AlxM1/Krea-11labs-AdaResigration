import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { uploadFromUrl, uploadFile } from "@/lib/storage/upload";
import { ComfyUIProvider } from "@/lib/ai/comfyui-provider";
import { OllamaProvider, checkOllamaHealth } from "@/lib/ai/ollama-provider";
import { z } from "zod";
import {
  LOGO_TYPES,
  VISUAL_STYLES,
  INDUSTRY_PRESETS,
  FONT_STYLES,
  buildLogoPrompt,
  generateVariationPlan,
  type LogoConfig,
  type LogoType,
  type TextPosition,
} from "@/lib/logo/config";
import {
  compositeIconWithText,
  generateTextOnly,
  generateEmblem,
} from "@/lib/logo/text-compositor";

const logoSchema = z.object({
  companyName: z.string().min(1).max(200),
  logoType: z.enum(["icon-text", "text-only", "icon-only", "emblem", "mascot"]).default("icon-text"),
  visualStyle: z.string().default("minimalist"),
  industry: z.string().nullable().default(null),
  fontStyle: z.string().default("sans-serif"),
  fontColor: z.string().default("#1E293B"),
  textPosition: z.enum(["below", "right", "emblem-arc"]).default("below"),
  colors: z.array(z.string()).max(5).default([]),
  count: z.number().min(1).max(16).default(4),
  async: z.boolean().default(false),
});

async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "Krya/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

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

    const { companyName, logoType, visualStyle, industry, fontStyle, fontColor, textPosition, colors, count } = validated.data;
    const colorStr = colors.length > 0 ? `, using colors: ${colors.join(", ")}` : "";

    const logoTypeConfig = LOGO_TYPES.find((t) => t.id === logoType);
    const needsIcon = logoTypeConfig?.hasIcon !== false;
    const needsText = logoTypeConfig?.hasText !== false;

    // Enhance base prompt via Ollama LLM if available
    let baseDescription = "";
    if (needsIcon) {
      try {
        if (await checkOllamaHealth()) {
          console.log("[Logo] Enhancing prompt via Ollama...");
          const ollama = new OllamaProvider();
          const enhanced = await ollama.generate(
            `Create a brief visual description for a ${visualStyle} logo icon for the company "${companyName}"${colorStr}. Describe the iconography, shapes, and composition in 1-2 sentences. Output ONLY the description. Do not include any text or lettering in the description.`,
            {
              system: `You are a logo design expert. Output a concise visual description (1-2 sentences) of what the logo icon should look like. Focus on icon shape, composition, and feel. Do not include style words like "minimalist" or "vintage" - those will be added separately. Never describe text or lettering - the icon should be purely visual/symbolic.`,
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
    }

    // Set up ComfyUI (only needed if we need icon generation)
    let comfyui: ComfyUIProvider | null = null;
    if (needsIcon) {
      const comfyuiUrl = process.env.COMFYUI_URL || (process.env.COMFYUI_HOST ? `http://${process.env.COMFYUI_HOST}:${process.env.COMFYUI_PORT || "8188"}` : "");
      if (!comfyuiUrl) {
        return NextResponse.json(
          { error: "ComfyUI not configured. Local GPU required for logo generation." },
          { status: 503 }
        );
      }
      comfyui = new ComfyUIProvider({ baseUrl: comfyuiUrl });
    }

    // Generate variation plan
    const variationPlan = generateVariationPlan(count, visualStyle, industry);

    const logoConfig: LogoConfig = {
      companyName,
      logoType: logoType as LogoType,
      visualStyle,
      industry,
      colors,
      fontStyle,
      fontColor,
      textPosition: textPosition as TextPosition,
    };

    // Stream results as NDJSON
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < count; i++) {
          const variation = variationPlan[i];

          const generation = await prisma.generation.create({
            data: {
              userId,
              type: "TEXT_TO_IMAGE",
              prompt: `Logo: ${companyName} [${logoType}/${variation.visualStyle}]`,
              model: "comfyui-flux",
              status: "PENDING",
              parameters: {
                tool: "logo-generation",
                companyName,
                logoType,
                visualStyle: variation.visualStyle,
                industry,
                fontStyle,
                fontColor,
                textPosition,
                colors,
                variation: i + 1,
                seed: variation.seed,
              },
            },
          });

          await prisma.generation.update({
            where: { id: generation.id },
            data: { status: "PROCESSING" },
          });

          try {
            let finalBuffer: Buffer | null = null;

            if (logoType === "text-only") {
              // Text-only: skip ComfyUI, generate via text compositor
              console.log(`[Logo] Generating text-only variation ${i + 1}/${count}`);
              finalBuffer = await generateTextOnly(companyName, {
                fontStyle,
                textColor: fontColor,
                canvasWidth: 1024,
                canvasHeight: 1024,
              });
            } else {
              // Generate icon via ComfyUI
              const logoPrompt = baseDescription
                ? `${buildLogoPrompt(logoConfig, variation.visualStyle).replace(/, no text no letters no words$/, "")}, ${baseDescription}, no text no letters no words`
                : buildLogoPrompt(logoConfig, variation.visualStyle);

              console.log(`[Logo] Generating variation ${i + 1}/${count}: ${variation.visualStyle}`);

              const aiResult = await comfyui!.generateImage({
                prompt: logoPrompt,
                negativePrompt: "text, words, letters, watermark, signature, blurry, low quality, distorted, alphabet, typography, font",
                width: 1024,
                height: 1024,
                steps: 20,
                seed: variation.seed,
              });

              if (aiResult.status === "failed" || !aiResult.imageUrl) {
                await prisma.generation.update({
                  where: { id: generation.id },
                  data: { status: "FAILED" },
                });
                controller.enqueue(encoder.encode(
                  JSON.stringify({ id: generation.id, status: "failed", error: aiResult.error, styleModifier: variation.visualStyle }) + "\n"
                ));
                continue;
              }

              if (needsText) {
                // Download icon buffer and composite text
                const iconBuffer = await downloadImageBuffer(aiResult.imageUrl);

                if (logoType === "emblem") {
                  finalBuffer = await generateEmblem(iconBuffer, companyName, {
                    fontStyle,
                    textColor: fontColor,
                    canvasWidth: 1024,
                    canvasHeight: 1024,
                  });
                } else {
                  // icon-text or mascot
                  finalBuffer = await compositeIconWithText(iconBuffer, companyName, {
                    fontStyle,
                    textColor: fontColor,
                    textPosition: textPosition as TextPosition,
                    canvasWidth: 1024,
                    canvasHeight: 1024,
                  });
                }
              } else {
                // icon-only: just download and re-upload
                let finalUrl: string | null = null;
                try {
                  const uploaded = await uploadFromUrl(aiResult.imageUrl, userId);
                  finalUrl = uploaded.url;
                } catch (uploadErr) {
                  console.error(`[Logo] Failed to upload variation ${i + 1}:`, uploadErr);
                  await prisma.generation.update({
                    where: { id: generation.id },
                    data: { status: "FAILED" },
                  });
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ id: generation.id, status: "failed", error: "Failed to save generated image", styleModifier: variation.visualStyle }) + "\n"
                  ));
                  continue;
                }

                await prisma.generation.update({
                  where: { id: generation.id },
                  data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
                });

                controller.enqueue(encoder.encode(
                  JSON.stringify({ id: generation.id, status: "completed", imageUrl: finalUrl, styleModifier: variation.visualStyle }) + "\n"
                ));
                continue;
              }
            }

            // Upload the composited buffer
            if (finalBuffer) {
              const filename = `logo-${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i + 1}-${Date.now()}.png`;
              const uploaded = await uploadFile(finalBuffer, userId, filename, "image/png", "generations");
              const finalUrl = uploaded.url;

              await prisma.generation.update({
                where: { id: generation.id },
                data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
              });

              controller.enqueue(encoder.encode(
                JSON.stringify({ id: generation.id, status: "completed", imageUrl: finalUrl, styleModifier: variation.visualStyle }) + "\n"
              ));
            }
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
                styleModifier: variation.visualStyle,
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
