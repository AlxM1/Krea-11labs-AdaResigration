import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const shareSchema = z.object({
  isPublic: z.boolean(),
});

/**
 * Toggle public sharing for a generation
 * POST /api/generations/[id]/share
 */
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

    const body = await req.json();
    const validated = shareSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Check if generation exists and belongs to user
    const generation = await prisma.generation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found or access denied" },
        { status: 404 }
      );
    }

    // Update public status
    const updated = await prisma.generation.update({
      where: { id },
      data: {
        isPublic: validated.data.isPublic,
      },
      select: {
        id: true,
        isPublic: true,
        likes: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      isPublic: updated.isPublic,
      message: updated.isPublic
        ? "Generation shared to gallery"
        : "Generation removed from gallery",
    });
  } catch (error) {
    console.error("Error toggling share status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get current share status
 * GET /api/generations/[id]/share
 */
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

    const generation = await prisma.generation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        isPublic: true,
        likes: true,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: generation.id,
      isPublic: generation.isPublic,
      likes: generation.likes,
    });
  } catch (error) {
    console.error("Error fetching share status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
