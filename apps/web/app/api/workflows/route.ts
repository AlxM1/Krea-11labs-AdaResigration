import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()),
});

const connectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(nodeSchema).default([]),
  connections: z.array(connectionSchema).default([]),
  isPublic: z.boolean().default(false),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createWorkflowSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Create workflow
    const workflow = await prisma.workflow.create({
      data: {
        userId: session.user.id,
        name: params.name,
        description: params.description,
        nodes: params.nodes,
        connections: params.connections,
        isPublic: params.isPublic,
      },
    });

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      connections: workflow.connections,
      isPublic: workflow.isPublic,
      createdAt: workflow.createdAt,
    });
  } catch (error) {
    console.error("Workflow creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includePublic = searchParams.get("includePublic") === "true";

    const where = includePublic
      ? {
          OR: [
            { userId: session.user.id },
            { isPublic: true },
          ],
        }
      : { userId: session.user.id };

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            nodes: false,
          },
        },
      },
    });

    // Add node count manually from JSON
    const workflowsWithCounts = workflows.map(w => ({
      ...w,
      nodeCount: 0, // Would parse from nodes JSON in real implementation
    }));

    const total = await prisma.workflow.count({ where });

    return NextResponse.json({ workflows: workflowsWithCounts, total, limit, offset });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
