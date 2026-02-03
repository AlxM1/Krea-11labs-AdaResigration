import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#7c3aed"),
  icon: z.string().max(50).default("folder"),
});

const updateProjectSchema = createProjectSchema.partial();

// Get user's projects
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            generations: true,
            videos: true,
          },
        },
      },
    });

    const total = await prisma.project.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      projects: projects.map(p => ({
        ...p,
        itemCount: p._count.generations + p._count.videos,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create project
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Check project limit based on tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const projectLimits: Record<string, number> = {
      FREE: 5,
      BASIC: 20,
      PRO: 100,
      MAX: 500,
      TEAM: -1, // Unlimited
      ENTERPRISE: -1,
    };

    const limit = projectLimits[user.subscriptionTier] || projectLimits.FREE;

    if (limit !== -1) {
      const currentCount = await prisma.project.count({
        where: { userId: session.user.id },
      });

      if (currentCount >= limit) {
        return NextResponse.json(
          { error: `Project limit reached. Your plan allows ${limit} projects.` },
          { status: 403 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        ...validated.data,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
