import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addItemsSchema = z.object({
  generationIds: z.array(z.string()).optional(),
  videoIds: z.array(z.string()).optional(),
}).refine(
  (data) => (data.generationIds && data.generationIds.length > 0) ||
            (data.videoIds && data.videoIds.length > 0),
  { message: "At least one generationId or videoId is required" }
);

// Add items to project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = addItemsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { generationIds, videoIds } = validated.data;
    let addedGenerations = 0;
    let addedVideos = 0;

    // Add generations to project
    if (generationIds && generationIds.length > 0) {
      const result = await prisma.generation.updateMany({
        where: {
          id: { in: generationIds },
          userId: session.user.id,
        },
        data: { projectId: id },
      });
      addedGenerations = result.count;
    }

    // Add videos to project
    if (videoIds && videoIds.length > 0) {
      const result = await prisma.video.updateMany({
        where: {
          id: { in: videoIds },
          userId: session.user.id,
        },
        data: { projectId: id },
      });
      addedVideos = result.count;
    }

    // Update project timestamp
    await prisma.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      addedGenerations,
      addedVideos,
      totalAdded: addedGenerations + addedVideos,
    });
  } catch (error) {
    console.error("Error adding items to project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove items from project
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

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const generationIds = searchParams.get("generationIds")?.split(",").filter(Boolean);
    const videoIds = searchParams.get("videoIds")?.split(",").filter(Boolean);

    if (!generationIds?.length && !videoIds?.length) {
      return NextResponse.json(
        { error: "At least one generationId or videoId is required" },
        { status: 400 }
      );
    }

    let removedGenerations = 0;
    let removedVideos = 0;

    // Remove generations from project (unlink, not delete)
    if (generationIds && generationIds.length > 0) {
      const result = await prisma.generation.updateMany({
        where: {
          id: { in: generationIds },
          userId: session.user.id,
          projectId: id,
        },
        data: { projectId: null },
      });
      removedGenerations = result.count;
    }

    // Remove videos from project
    if (videoIds && videoIds.length > 0) {
      const result = await prisma.video.updateMany({
        where: {
          id: { in: videoIds },
          userId: session.user.id,
          projectId: id,
        },
        data: { projectId: null },
      });
      removedVideos = result.count;
    }

    return NextResponse.json({
      success: true,
      removedGenerations,
      removedVideos,
      totalRemoved: removedGenerations + removedVideos,
    });
  } catch (error) {
    console.error("Error removing items from project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
