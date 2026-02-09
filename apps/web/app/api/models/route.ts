import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(["all", "LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"]).default("all"),
  status: z.enum(["all", "COMPLETED", "TRAINING", "PENDING", "FAILED"]).default("all"),
  includePublic: z.coerce.boolean().default(false),
});

// Get user's trained models
export async function GET(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      includePublic: searchParams.get("includePublic"),
    });

    // Build where clause
    const where: Record<string, unknown> = query.includePublic
      ? {
          OR: [
            { userId: session.user.id },
            { isPublic: true },
          ],
        }
      : { userId: session.user.id };

    if (query.type !== "all") {
      where.type = query.type;
    }

    if (query.status !== "all") {
      where.status = query.status;
    }

    const models = await prisma.trainedModel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const total = await prisma.trainedModel.count({ where });

    return NextResponse.json({
      models: models.map((m: typeof models[number]) => ({
        ...m,
        isOwner: m.userId === session.user.id,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get available base models
export async function OPTIONS(req: NextRequest) {
  const baseModels = [
    {
      id: "flux-dev",
      name: "Flux Dev",
      description: "High quality general purpose model",
      supportedTypes: ["LORA"],
    },
    {
      id: "sdxl",
      name: "Stable Diffusion XL",
      description: "Versatile model with good quality",
      supportedTypes: ["LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"],
    },
    {
      id: "sd15",
      name: "Stable Diffusion 1.5",
      description: "Classic model with wide compatibility",
      supportedTypes: ["LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"],
    },
  ];

  return NextResponse.json({ baseModels });
}
