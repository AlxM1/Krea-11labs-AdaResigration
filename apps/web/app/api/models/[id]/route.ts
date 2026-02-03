import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateModelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  triggerWord: z.string().min(1).max(50).optional(),
  isPublic: z.boolean().optional(),
  previewImages: z.array(z.string().url()).max(10).optional(),
});

// Get single model
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const model = await prisma.trainedModel.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            generations: true,
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...model,
      isOwner: model.userId === session.user.id,
      usageCount: model._count.generations,
    });
  } catch (error) {
    console.error("Error fetching model:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update model
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.trainedModel.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Model not found or access denied" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = updateModelSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const model = await prisma.trainedModel.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete model
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.trainedModel.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Model not found or access denied" },
        { status: 404 }
      );
    }

    // Check if model is in use (has generations)
    const usageCount = await prisma.generation.count({
      where: { modelId: id },
    });

    // Delete model (and optionally clean up storage)
    await prisma.trainedModel.delete({
      where: { id },
    });

    // In production, also delete model files from storage
    // await deleteModelFiles(existing.modelUrl);

    return NextResponse.json({
      success: true,
      message: usageCount > 0
        ? `Model deleted. Note: ${usageCount} generations used this model.`
        : "Model deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
