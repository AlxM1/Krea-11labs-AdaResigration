import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(["all", "image", "video", "3d"]).default("all"),
  status: z.enum(["all", "completed", "processing", "failed"]).default("all"),
  model: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      model: searchParams.get("model"),
      projectId: searchParams.get("projectId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      search: searchParams.get("search"),
    });

    // Build where clause for generations
    const generationWhere: Record<string, unknown> = {
      userId: session.user.id,
    };

    // Build where clause for videos
    const videoWhere: Record<string, unknown> = {
      userId: session.user.id,
    };

    // Status filter
    if (query.status !== "all") {
      const statusMap: Record<string, string> = {
        completed: "COMPLETED",
        processing: "PROCESSING",
        failed: "FAILED",
      };
      generationWhere.status = statusMap[query.status];
      videoWhere.status = statusMap[query.status];
    }

    // Model filter
    if (query.model) {
      generationWhere.model = query.model;
      videoWhere.model = query.model;
    }

    // Project filter
    if (query.projectId) {
      generationWhere.projectId = query.projectId;
      videoWhere.projectId = query.projectId;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }
      generationWhere.createdAt = dateFilter;
      videoWhere.createdAt = dateFilter;
    }

    // Search filter
    if (query.search) {
      generationWhere.prompt = { contains: query.search, mode: "insensitive" };
      videoWhere.prompt = { contains: query.search, mode: "insensitive" };
    }

    const items: Array<{
      id: string;
      type: string;
      itemType: "generation" | "video";
      prompt: string | null;
      imageUrl?: string | null;
      videoUrl?: string | null;
      thumbnailUrl: string | null;
      model: string;
      status: string;
      width: number;
      height: number;
      createdAt: Date;
      projectId?: string | null;
    }> = [];

    // Fetch generations if needed
    if (query.type === "all" || query.type === "image" || query.type === "3d") {
      // Filter by type if specific
      if (query.type === "image") {
        generationWhere.type = { in: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "INPAINTING", "UPSCALE", "EDIT"] };
      } else if (query.type === "3d") {
        generationWhere.type = "THREE_D";
      }

      const generations = await prisma.generation.findMany({
        where: generationWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          imageUrl: true,
          thumbnailUrl: true,
          model: true,
          status: true,
          width: true,
          height: true,
          createdAt: true,
          projectId: true,
        },
      });

      items.push(...generations.map((g: typeof generations[number]) => ({
        ...g,
        itemType: "generation" as const,
      })));
    }

    // Fetch videos if needed
    if (query.type === "all" || query.type === "video") {
      const videos = await prisma.video.findMany({
        where: videoWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          videoUrl: true,
          thumbnailUrl: true,
          model: true,
          status: true,
          width: true,
          height: true,
          createdAt: true,
          projectId: true,
        },
      });

      items.push(...videos.map((v: typeof videos[number]) => ({
        ...v,
        itemType: "video" as const,
      })));
    }

    // Sort all items by date
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Get total count
    const total = items.length;

    // Paginate
    const paginated = items.slice(query.offset, query.offset + query.limit);

    // Get usage stats for the period
    const statsWhere: Record<string, unknown> = { userId: session.user.id };
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);
      statsWhere.createdAt = dateFilter;
    }

    const [generationCount, videoCount, totalCreditsUsed] = await Promise.all([
      prisma.generation.count({ where: { ...generationWhere, userId: session.user.id } }),
      prisma.video.count({ where: { ...videoWhere, userId: session.user.id } }),
      prisma.usageLog.aggregate({
        where: statsWhere,
        _sum: { creditsUsed: true },
      }),
    ]);

    return NextResponse.json({
      items: paginated,
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + paginated.length < total,
      stats: {
        generations: generationCount,
        videos: videoCount,
        creditsUsed: totalCreditsUsed._sum.creditsUsed || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Bulk delete history items
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { generationIds, videoIds, deleteAll } = z.object({
      generationIds: z.array(z.string()).optional(),
      videoIds: z.array(z.string()).optional(),
      deleteAll: z.boolean().optional(),
    }).parse(body);

    let deletedGenerations = 0;
    let deletedVideos = 0;

    if (deleteAll) {
      // Delete all user's history
      const [genResult, vidResult] = await Promise.all([
        prisma.generation.deleteMany({ where: { userId: session.user.id } }),
        prisma.video.deleteMany({ where: { userId: session.user.id } }),
      ]);
      deletedGenerations = genResult.count;
      deletedVideos = vidResult.count;
    } else {
      // Delete specific items
      if (generationIds?.length) {
        const result = await prisma.generation.deleteMany({
          where: {
            id: { in: generationIds },
            userId: session.user.id,
          },
        });
        deletedGenerations = result.count;
      }

      if (videoIds?.length) {
        const result = await prisma.video.deleteMany({
          where: {
            id: { in: videoIds },
            userId: session.user.id,
          },
        });
        deletedVideos = result.count;
      }
    }

    return NextResponse.json({
      success: true,
      deletedGenerations,
      deletedVideos,
      totalDeleted: deletedGenerations + deletedVideos,
    });
  } catch (error) {
    console.error("Error deleting history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
