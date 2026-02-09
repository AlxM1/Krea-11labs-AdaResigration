import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(30),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(["all", "image", "video", "3d"]).default("all"),
  sort: z.enum(["recent", "popular", "trending"]).default("recent"),
  model: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      type: searchParams.get("type"),
      sort: searchParams.get("sort"),
      model: searchParams.get("model"),
      userId: searchParams.get("userId"),
    });

    // Build where clause
    const where: Record<string, unknown> = {
      isPublic: true,
      status: "COMPLETED",
    };

    if (query.type !== "all") {
      const typeMap: Record<string, string[]> = {
        image: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "INPAINT", "UPSCALE"],
        video: ["VIDEO"],
        "3d": ["3D"],
      };
      where.type = { in: typeMap[query.type] };
    }

    if (query.model) {
      where.model = query.model;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    // Build order by
    let orderBy: Record<string, string>;
    switch (query.sort) {
      case "popular":
        orderBy = { likes: "desc" };
        break;
      case "trending":
        // Trending = recent + popular
        orderBy = { likes: "desc" };
        where.createdAt = {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
    }

    const generations = await prisma.generation.findMany({
      where,
      orderBy,
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        type: true,
        prompt: true,
        imageUrl: true,
        width: true,
        height: true,
        model: true,
        likes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const total = await prisma.generation.count({ where });

    // Get session for like status
    const session = await auth(req);
    let likedIds: Set<string> = new Set();

    if (session?.user) {
      // In a real app, we'd have a separate likes table
      // For now, we'll skip this
    }

    const items = generations.map((g: typeof generations[number]) => ({
      ...g,
      isLiked: likedIds.has(g.id),
    }));

    return NextResponse.json({
      items,
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + generations.length < total,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Like/unlike an item
export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { generationId, action } = z.object({
      generationId: z.string(),
      action: z.enum(["like", "unlike"]),
    }).parse(body);

    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Update like count
    const increment = action === "like" ? 1 : -1;
    const updated = await prisma.generation.update({
      where: { id: generationId },
      data: {
        likes: {
          increment: Math.max(0, (generation.likes || 0) + increment) === 0 && increment < 0
            ? 0
            : increment,
        },
      },
      select: {
        id: true,
        likes: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      likes: Math.max(0, updated.likes || 0),
      isLiked: action === "like",
    });
  } catch (error) {
    console.error("Error updating like:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
