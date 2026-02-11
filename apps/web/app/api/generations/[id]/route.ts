import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { deleteFile } from "@/lib/storage/upload";

/**
 * DELETE /api/generations/:id - Delete a generation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";
    const { id } = await params;

    // Find the generation
    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (generation.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete the file if it exists
    if (generation.imageUrl && generation.imageUrl.startsWith("/api/uploads/")) {
      try {
        const key = generation.imageUrl.replace("/api/uploads/", "");
        await deleteFile(key);
      } catch (error) {
        console.error("Failed to delete file:", error);
        // Continue with DB deletion even if file deletion fails
      }
    }

    // Delete from database
    await prisma.generation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete generation error:", error);
    return NextResponse.json(
      { error: "Failed to delete generation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generations/:id - Get a single generation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);
    const userId = session?.user?.id || "personal-user";
    const { id } = await params;

    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Check ownership for private generations
    if (generation.userId !== userId && !generation.isPublic) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error("Get generation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation" },
      { status: 500 }
    );
  }
}
