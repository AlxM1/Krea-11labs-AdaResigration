import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Admin role check
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
  return user?.email ? adminEmails.includes(user.email) : false;
}

const updateUserSchema = z.object({
  subscriptionTier: z.enum(["FREE", "BASIC", "PRO", "MAX", "TEAM", "ENTERPRISE"]).optional(),
  creditsRemaining: z.number().min(0).optional(),
  addCredits: z.number().min(0).optional(),
});

// Get single user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: {
          select: {
            generations: true,
            videos: true,
            trainedModels: true,
            workflows: true,
            projects: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get recent activity
    const [recentGenerations, recentUsage] = await Promise.all([
      prisma.generation.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          prompt: true,
          imageUrl: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.usageLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          actionType: true,
          creditsUsed: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate total credits used
    const totalCreditsUsed = await prisma.usageLog.aggregate({
      where: { userId: id },
      _sum: { creditsUsed: true },
    });

    return NextResponse.json({
      ...user,
      stats: user._count,
      recentGenerations,
      recentUsage,
      totalCreditsUsed: totalCreditsUsed._sum.creditsUsed || 0,
      _count: undefined,
    });
  } catch (error) {
    console.error("Admin get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateUserSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { subscriptionTier, creditsRemaining, addCredits } = validated.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (subscriptionTier) {
      updateData.subscriptionTier = subscriptionTier;
    }

    if (creditsRemaining !== undefined) {
      updateData.creditsRemaining = creditsRemaining;
    }

    if (addCredits) {
      updateData.creditsRemaining = {
        increment: addCredits,
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        creditsRemaining: true,
      },
    });

    // Log admin action
    await prisma.usageLog.create({
      data: {
        userId: id,
        actionType: "ADMIN_UPDATE",
        creditsUsed: 0,
        metadata: {
          adminId: session.user.id,
          changes: validated.data,
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete user (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user (cascades to related records via Prisma schema)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} has been deleted`,
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
