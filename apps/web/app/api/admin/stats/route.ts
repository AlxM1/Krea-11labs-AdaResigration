import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Admin role check (in production, implement proper RBAC)
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  // For now, check against admin emails list
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
  return user?.email ? adminEmails.includes(user.email) : false;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d"; // 24h, 7d, 30d, all

    // Calculate date range
    let startDate: Date | undefined;
    const now = new Date();

    switch (period) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = undefined;
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // Fetch all stats in parallel
    const [
      totalUsers,
      newUsers,
      activeUsers,
      totalGenerations,
      newGenerations,
      totalVideos,
      newVideos,
      totalTrainedModels,
      totalWorkflows,
      subscriptionStats,
      usageStats,
      topModels,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // New users in period
      prisma.user.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }),

      // Active users (had activity in period)
      prisma.usageLog.groupBy({
        by: ["userId"],
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }).then(r => r.length),

      // Total generations
      prisma.generation.count(),

      // New generations in period
      prisma.generation.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }),

      // Total videos
      prisma.video.count(),

      // New videos in period
      prisma.video.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }),

      // Total trained models
      prisma.trainedModel.count(),

      // Total workflows
      prisma.workflow.count(),

      // Subscription breakdown
      prisma.user.groupBy({
        by: ["subscriptionTier"],
        _count: true,
      }),

      // Total credits used in period
      prisma.usageLog.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        _sum: { creditsUsed: true },
      }),

      // Top models by usage
      prisma.generation.groupBy({
        by: ["model"],
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        _count: true,
        orderBy: { _count: { model: "desc" } },
        take: 10,
      }),
    ]);

    // Format subscription stats
    const subscriptions: Record<string, number> = {};
    for (const s of subscriptionStats) {
      subscriptions[s.subscriptionTier] = s._count;
    }

    return NextResponse.json({
      period,
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        subscriptions,
      },
      content: {
        generations: {
          total: totalGenerations,
          new: newGenerations,
        },
        videos: {
          total: totalVideos,
          new: newVideos,
        },
        trainedModels: totalTrainedModels,
        workflows: totalWorkflows,
      },
      usage: {
        creditsUsed: usageStats._sum.creditsUsed || 0,
        topModels: topModels.map(m => ({
          model: m.model,
          count: m._count,
        })),
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
