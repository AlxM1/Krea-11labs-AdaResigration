import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addFavoriteSchema = z.object({
  generationId: z.string().optional(),
  videoId: z.string().optional(),
  workflowId: z.string().optional(),
  modelId: z.string().optional(),
}).refine(
  (data) => data.generationId || data.videoId || data.workflowId || data.modelId,
  { message: "One of generationId, videoId, workflowId, or modelId is required" }
);

// Get favorites
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") || "all"; // all, image, video, workflow, model

    // Get user with their favorites
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        favoriteGenerations: true,
        favoriteVideos: true,
        favoriteWorkflows: true,
        favoriteModels: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const favorites: Array<{
      id: string;
      type: string;
      item: unknown;
      favoritedAt: Date;
    }> = [];

    // Fetch generations if needed
    if (type === "all" || type === "image") {
      const generations = await prisma.generation.findMany({
        where: {
          id: { in: user.favoriteGenerations },
        },
        select: {
          id: true,
          type: true,
          prompt: true,
          imageUrl: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          model: true,
          createdAt: true,
        },
      });

      favorites.push(...generations.map((g: typeof generations[number]) => ({
        id: g.id,
        type: "generation",
        item: g,
        favoritedAt: g.createdAt, // Approximation
      })));
    }

    // Fetch videos if needed
    if (type === "all" || type === "video") {
      const videos = await prisma.video.findMany({
        where: {
          id: { in: user.favoriteVideos },
        },
        select: {
          id: true,
          type: true,
          prompt: true,
          videoUrl: true,
          thumbnailUrl: true,
          model: true,
          durationSeconds: true,
          createdAt: true,
        },
      });

      favorites.push(...videos.map((v: typeof videos[number]) => ({
        id: v.id,
        type: "video",
        item: v,
        favoritedAt: v.createdAt,
      })));
    }

    // Fetch workflows if needed
    if (type === "all" || type === "workflow") {
      const workflows = await prisma.workflow.findMany({
        where: {
          id: { in: user.favoriteWorkflows },
        },
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          runCount: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      favorites.push(...workflows.map((w: typeof workflows[number]) => ({
        id: w.id,
        type: "workflow",
        item: w,
        favoritedAt: w.createdAt,
      })));
    }

    // Fetch models if needed
    if (type === "all" || type === "model") {
      const models = await prisma.trainedModel.findMany({
        where: {
          id: { in: user.favoriteModels },
        },
        select: {
          id: true,
          name: true,
          type: true,
          triggerWord: true,
          previewImages: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      favorites.push(...models.map((m: typeof models[number]) => ({
        id: m.id,
        type: "model",
        item: m,
        favoritedAt: m.createdAt,
      })));
    }

    // Sort by favorited date (most recent first)
    favorites.sort((a, b) => b.favoritedAt.getTime() - a.favoritedAt.getTime());

    // Paginate
    const paginated = favorites.slice(offset, offset + limit);

    return NextResponse.json({
      favorites: paginated,
      total: favorites.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add to favorites
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = addFavoriteSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { generationId, videoId, workflowId, modelId } = validated.data;

    // Get current user favorites to prevent duplicates
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        favoriteGenerations: true,
        favoriteVideos: true,
        favoriteWorkflows: true,
        favoriteModels: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user favorites (with duplicate prevention)
    if (generationId && !user.favoriteGenerations.includes(generationId)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteGenerations: { push: generationId },
        },
      });
    }

    if (videoId && !user.favoriteVideos.includes(videoId)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteVideos: { push: videoId },
        },
      });
    }

    if (workflowId && !user.favoriteWorkflows.includes(workflowId)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteWorkflows: { push: workflowId },
        },
      });
    }

    if (modelId && !user.favoriteModels.includes(modelId)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteModels: { push: modelId },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove from favorites
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const generationId = searchParams.get("generationId");
    const videoId = searchParams.get("videoId");
    const workflowId = searchParams.get("workflowId");
    const modelId = searchParams.get("modelId");

    if (!generationId && !videoId && !workflowId && !modelId) {
      return NextResponse.json(
        { error: "One of generationId, videoId, workflowId, or modelId is required" },
        { status: 400 }
      );
    }

    // Get current user favorites
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        favoriteGenerations: true,
        favoriteVideos: true,
        favoriteWorkflows: true,
        favoriteModels: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update appropriate favorites list
    if (generationId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteGenerations: user.favoriteGenerations.filter((id: string) => id !== generationId),
        },
      });
    }

    if (videoId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteVideos: user.favoriteVideos.filter((id: string) => id !== videoId),
        },
      });
    }

    if (workflowId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteWorkflows: user.favoriteWorkflows.filter((id: string) => id !== workflowId),
        },
      });
    }

    if (modelId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          favoriteModels: user.favoriteModels.filter((id: string) => id !== modelId),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
