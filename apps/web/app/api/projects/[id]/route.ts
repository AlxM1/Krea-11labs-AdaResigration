import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

// Get single project with items
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

    const { searchParams } = new URL(req.url);
    const itemLimit = parseInt(searchParams.get("itemLimit") || "50");
    const itemOffset = parseInt(searchParams.get("itemOffset") || "0");

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        generations: {
          orderBy: { createdAt: "desc" },
          take: itemLimit,
          skip: itemOffset,
          select: {
            id: true,
            type: true,
            prompt: true,
            imageUrl: true,
            thumbnailUrl: true,
            width: true,
            height: true,
            model: true,
            status: true,
            createdAt: true,
          },
        },
        videos: {
          orderBy: { createdAt: "desc" },
          take: itemLimit,
          skip: itemOffset,
          select: {
            id: true,
            type: true,
            prompt: true,
            videoUrl: true,
            thumbnailUrl: true,
            model: true,
            status: true,
            durationSeconds: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            generations: true,
            videos: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Combine and sort items by date
    const allItems = [
      ...project.generations.map((g: typeof project.generations[number]) => ({ ...g, itemType: "generation" })),
      ...project.videos.map((v: typeof project.videos[number]) => ({ ...v, itemType: "video" })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      ...project,
      items: allItems.slice(0, itemLimit),
      totalItems: project._count.generations + project._count.videos,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update project
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

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = updateProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete project
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

    // Check ownership
    const existing = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            generations: true,
            videos: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Option to delete items with project
    const { searchParams } = new URL(req.url);
    const deleteItems = searchParams.get("deleteItems") === "true";

    if (deleteItems) {
      // Delete all items in project
      await prisma.generation.deleteMany({
        where: { projectId: id },
      });
      await prisma.video.deleteMany({
        where: { projectId: id },
      });
    } else {
      // Just unlink items from project
      await prisma.generation.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      });
      await prisma.video.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      });
    }

    // Delete project
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      itemsAffected: existing._count.generations + existing._count.videos,
      itemsDeleted: deleteItems,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
