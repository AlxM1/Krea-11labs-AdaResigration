import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/generations - Get all generations with filters
 * Consolidates gallery and history functionality
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    const where: any = { userId };

    if (type && type !== "all") {
      where.type = type.toUpperCase().replace(/-/g, "_");
    }

    if (search) {
      where.prompt = { contains: search, mode: "insensitive" };
    }

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          prompt: true,
          model: true,
          status: true,
          imageUrl: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          createdAt: true,
        },
      }),
      prisma.generation.count({ where }),
    ]);

    return NextResponse.json({
      generations,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Generations API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
