import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  types: z.string().optional(), // comma-separated: generation,video,workflow,model,project
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  includePublic: z.coerce.boolean().default(false),
});

interface SearchResult {
  id: string;
  type: "generation" | "video" | "workflow" | "model" | "project";
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  relevance: number;
  data: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchSchema.parse({
      q: searchParams.get("q") || "",
      types: searchParams.get("types"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      includePublic: searchParams.get("includePublic"),
    });

    const searchTerm = query.q.toLowerCase();
    const types = query.types?.split(",") || ["generation", "video", "workflow", "model", "project"];
    const results: SearchResult[] = [];

    // Build ownership filter
    const ownerFilter = query.includePublic
      ? { OR: [{ userId: session.user.id }, { isPublic: true }] }
      : { userId: session.user.id };

    // Search generations
    if (types.includes("generation")) {
      const generations = await prisma.generation.findMany({
        where: {
          ...ownerFilter,
          prompt: { contains: searchTerm, mode: "insensitive" },
        },
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          thumbnailUrl: true,
          model: true,
          type: true,
          createdAt: true,
        },
      });

      results.push(...generations.map(g => ({
        id: g.id,
        type: "generation" as const,
        title: g.prompt.slice(0, 100),
        description: `${g.type} - ${g.model}`,
        imageUrl: g.thumbnailUrl || g.imageUrl,
        createdAt: g.createdAt,
        relevance: calculateRelevance(g.prompt, searchTerm),
        data: { model: g.model, type: g.type },
      })));
    }

    // Search videos
    if (types.includes("video")) {
      const videos = await prisma.video.findMany({
        where: {
          ...ownerFilter,
          prompt: { contains: searchTerm, mode: "insensitive" },
        },
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          videoUrl: true,
          thumbnailUrl: true,
          model: true,
          type: true,
          durationSeconds: true,
          createdAt: true,
        },
      });

      results.push(...videos.map(v => ({
        id: v.id,
        type: "video" as const,
        title: v.prompt?.slice(0, 100) || "Video",
        description: `${v.type} - ${v.model}${v.durationSeconds ? ` - ${v.durationSeconds}s` : ""}`,
        imageUrl: v.thumbnailUrl,
        createdAt: v.createdAt,
        relevance: calculateRelevance(v.prompt || "", searchTerm),
        data: { model: v.model, type: v.type, duration: v.durationSeconds },
      })));
    }

    // Search workflows
    if (types.includes("workflow")) {
      const workflows = await prisma.workflow.findMany({
        where: {
          ...ownerFilter,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: query.limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          runCount: true,
          createdAt: true,
        },
      });

      results.push(...workflows.map(w => ({
        id: w.id,
        type: "workflow" as const,
        title: w.name,
        description: w.description,
        imageUrl: w.thumbnail,
        createdAt: w.createdAt,
        relevance: calculateRelevance(w.name + " " + (w.description || ""), searchTerm),
        data: { runCount: w.runCount },
      })));
    }

    // Search trained models
    if (types.includes("model")) {
      const models = await prisma.trainedModel.findMany({
        where: {
          ...ownerFilter,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
            { triggerWord: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          triggerWord: true,
          type: true,
          status: true,
          previewImages: true,
          createdAt: true,
        },
      });

      results.push(...models.map(m => ({
        id: m.id,
        type: "model" as const,
        title: m.name,
        description: m.description || `Trigger: ${m.triggerWord}`,
        imageUrl: m.previewImages?.[0] || null,
        createdAt: m.createdAt,
        relevance: calculateRelevance(m.name + " " + (m.description || "") + " " + (m.triggerWord || ""), searchTerm),
        data: { triggerWord: m.triggerWord, modelType: m.type, status: m.status },
      })));
    }

    // Search projects
    if (types.includes("project")) {
      const projects = await prisma.project.findMany({
        where: {
          userId: session.user.id, // Projects are always user-owned
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: query.limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          thumbnail: true,
          type: true,
          createdAt: true,
          _count: {
            select: {
              generations: true,
              videos: true,
            },
          },
        },
      });

      results.push(...projects.map(p => ({
        id: p.id,
        type: "project" as const,
        title: p.name,
        description: `${p._count.generations + p._count.videos} items`,
        imageUrl: p.thumbnail,
        createdAt: p.createdAt,
        relevance: calculateRelevance(p.name, searchTerm),
        data: { projectType: p.type, itemCount: p._count.generations + p._count.videos },
      })));
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Paginate
    const total = results.length;
    const paginated = results.slice(query.offset, query.offset + query.limit);

    return NextResponse.json({
      results: paginated,
      total,
      limit: query.limit,
      offset: query.offset,
      query: query.q,
      hasMore: query.offset + paginated.length < total,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Simple relevance calculation based on term frequency
function calculateRelevance(text: string, searchTerm: string): number {
  const lowerText = text.toLowerCase();
  const terms = searchTerm.toLowerCase().split(/\s+/);

  let score = 0;

  for (const term of terms) {
    // Exact match bonus
    if (lowerText.includes(term)) {
      score += 10;

      // Title/beginning match bonus
      if (lowerText.startsWith(term)) {
        score += 5;
      }

      // Count occurrences
      const regex = new RegExp(term, "gi");
      const matches = lowerText.match(regex);
      score += (matches?.length || 0) * 2;
    }
  }

  // Phrase match bonus
  if (lowerText.includes(searchTerm.toLowerCase())) {
    score += 20;
  }

  return score;
}
