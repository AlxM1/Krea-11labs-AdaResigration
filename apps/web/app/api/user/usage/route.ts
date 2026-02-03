import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's current credits and tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        creditsRemaining: true,
        creditsResetAt: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await prisma.usageLog.groupBy({
      by: ["actionType"],
      where: {
        userId: session.user.id,
        createdAt: { gte: today },
      },
      _sum: {
        creditsUsed: true,
      },
    });

    // Get this month's usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthUsage = await prisma.usageLog.groupBy({
      by: ["actionType"],
      where: {
        userId: session.user.id,
        createdAt: { gte: monthStart },
      },
      _sum: {
        creditsUsed: true,
      },
    });

    // Get generation counts
    const generationCounts = await prisma.generation.groupBy({
      by: ["type"],
      where: {
        userId: session.user.id,
        createdAt: { gte: monthStart },
      },
      _count: true,
    });

    const videoCounts = await prisma.video.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: monthStart },
      },
    });

    // Define limits based on tier
    const tierLimits = {
      FREE: { daily: 50, monthly: 1500, images: 50, videos: 10 },
      BASIC: { daily: 200, monthly: 6000, images: 200, videos: 30 },
      PRO: { daily: -1, monthly: -1, images: -1, videos: -1 }, // Unlimited
      MAX: { daily: -1, monthly: -1, images: -1, videos: -1 },
      TEAM: { daily: -1, monthly: -1, images: -1, videos: -1 },
      ENTERPRISE: { daily: -1, monthly: -1, images: -1, videos: -1 },
    };

    const limits = tierLimits[user.subscriptionTier] || tierLimits.FREE;

    return NextResponse.json({
      credits: {
        remaining: user.creditsRemaining,
        resetsAt: user.creditsResetAt,
      },
      tier: user.subscriptionTier,
      limits,
      usage: {
        today: todayUsage.reduce((acc, u) => ({
          ...acc,
          [u.actionType]: u._sum.creditsUsed || 0,
        }), {}),
        month: monthUsage.reduce((acc, u) => ({
          ...acc,
          [u.actionType]: u._sum.creditsUsed || 0,
        }), {}),
        generations: generationCounts.reduce((acc, g) => ({
          ...acc,
          [g.type]: g._count,
        }), {}),
        videos: videoCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
