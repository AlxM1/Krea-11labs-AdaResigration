import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const executeWorkflowSchema = z.object({
  inputs: z.record(z.unknown()).optional(),
});

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = executeWorkflowSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Get workflow
    const workflow = await prisma.workflow.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditsRemaining: true },
    });

    if (!user || user.creditsRemaining < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    const nodes = workflow.nodes as unknown as WorkflowNode[];
    const connections = workflow.connections as unknown as WorkflowConnection[];

    // Validate workflow structure
    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: "Workflow has no nodes" },
        { status: 400 }
      );
    }

    // Execute workflow
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would:
    // 1. Topologically sort nodes
    // 2. Execute each node in order
    // 3. Pass outputs between connected nodes
    // 4. Handle errors and retries

    const result = await executeWorkflowNodes(nodes, connections, validated.data.inputs || {});

    // Calculate credits used based on nodes executed
    const creditsUsed = calculateWorkflowCredits(nodes);

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { creditsRemaining: { decrement: creditsUsed } },
    });

    // Log usage
    await prisma.usageLog.create({
      data: {
        userId: session.user.id,
        actionType: "WORKFLOW_EXECUTION",
        creditsUsed,
        metadata: {
          workflowId: id,
          executionId,
          nodeCount: nodes.length,
        },
      },
    });

    // Increment run count
    await prisma.workflow.update({
      where: { id },
      data: { runCount: { increment: 1 } },
    });

    return NextResponse.json({
      executionId,
      status: result.status,
      outputs: result.outputs,
      creditsUsed,
    });
  } catch (error) {
    console.error("Workflow execution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function executeWorkflowNodes(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[],
  inputs: Record<string, unknown>
): Promise<{ status: string; outputs: Record<string, unknown> }> {
  // Build execution graph
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const outputs: Record<string, unknown> = {};

  // Find input nodes and set initial values
  const inputNodes = nodes.filter(n => n.type === "input");
  for (const inputNode of inputNodes) {
    const inputKey = inputNode.data.inputKey as string || inputNode.id;
    outputs[inputNode.id] = inputs[inputKey] || inputNode.data.defaultValue;
  }

  // Topological sort and execute
  const executed = new Set<string>(inputNodes.map(n => n.id));
  const queue = [...nodes.filter(n => n.type !== "input")];

  let iterations = 0;
  const maxIterations = nodes.length * 2;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const node = queue.shift()!;

    // Check if all inputs are ready
    const inputConnections = connections.filter(c => c.target === node.id);
    const inputsReady = inputConnections.every(c => executed.has(c.source));

    if (!inputsReady) {
      queue.push(node);
      continue;
    }

    // Gather inputs for this node
    const nodeInputs: Record<string, unknown> = {};
    for (const conn of inputConnections) {
      const handle = conn.targetHandle || "input";
      nodeInputs[handle] = outputs[conn.source];
    }

    // Execute node (simulated)
    const result = await executeNode(node, nodeInputs);
    outputs[node.id] = result;
    executed.add(node.id);
  }

  // Find output nodes
  const outputNodes = nodes.filter(n => n.type === "output");
  const finalOutputs: Record<string, unknown> = {};

  for (const outputNode of outputNodes) {
    const outputKey = outputNode.data.outputKey as string || outputNode.id;
    finalOutputs[outputKey] = outputs[outputNode.id];
  }

  return {
    status: "completed",
    outputs: Object.keys(finalOutputs).length > 0 ? finalOutputs : outputs,
  };
}

async function executeNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  // In production, each node type would have its own executor
  switch (node.type) {
    case "text-input":
      return node.data.value || inputs.input;

    case "image-input":
      return node.data.imageUrl || inputs.input;

    case "generate-image":
      // Would call actual image generation API
      return {
        imageUrl: `https://storage.krya.ai/generated/${Date.now()}.png`,
        prompt: inputs.prompt,
      };

    case "upscale":
      // Would call upscale API
      return {
        imageUrl: `https://storage.krya.ai/upscaled/${Date.now()}.png`,
        scale: node.data.scale || 2,
      };

    case "remove-background":
      return {
        imageUrl: `https://storage.krya.ai/nobg/${Date.now()}.png`,
      };

    case "merge":
      return Object.values(inputs);

    case "output":
      return inputs.input;

    default:
      return inputs;
  }
}

function calculateWorkflowCredits(nodes: WorkflowNode[]): number {
  let credits = 0;

  for (const node of nodes) {
    switch (node.type) {
      case "generate-image":
        credits += 1;
        break;
      case "upscale":
        credits += 1;
        break;
      case "generate-video":
        credits += 5;
        break;
      case "generate-3d":
        credits += 5;
        break;
      case "remove-background":
        credits += 0.5;
        break;
      default:
        // Utility nodes are free
        break;
    }
  }

  return Math.max(1, Math.ceil(credits));
}
