import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { executeNode, type WorkflowNode as NodeType } from "@/lib/workflow/node-executor";

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
    const session = await auth(req);
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

    const result = await executeWorkflowNodes(
      nodes,
      connections,
      validated.data.inputs || {},
      {
        workflowId: id,
        executionId,
        userId: session.user.id,
      }
    );

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
      errors: result.errors,
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
  inputs: Record<string, unknown>,
  context: { workflowId: string; executionId: string; userId: string }
): Promise<{ status: string; outputs: Record<string, unknown>; errors?: string[] }> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const outputs: Record<string, unknown> = {};
  const errors: string[] = [];

  // Find input nodes and set initial values
  const inputNodes = nodes.filter(n => n.type === "input" || n.type === "text-input" || n.type === "image-input");
  for (const inputNode of inputNodes) {
    const inputKey = inputNode.data.inputKey as string || inputNode.id;
    outputs[inputNode.id] = inputs[inputKey] || inputNode.data.defaultValue;
  }

  // Topological sort and execute
  const executed = new Set<string>(inputNodes.map(n => n.id));
  const queue = [...nodes.filter(n => !inputNodes.includes(n))];

  let iterations = 0;
  const maxIterations = nodes.length * 3;

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

    // Execute node using real executor
    try {
      const result = await executeNode(node as NodeType, nodeInputs, context);

      if (result.success) {
        outputs[node.id] = result.output;
        executed.add(node.id);
        console.log(`Node ${node.id} executed successfully in ${result.duration}ms`);
      } else {
        errors.push(`Node ${node.id} (${node.type}) failed: ${result.error}`);
        console.error(`Node ${node.id} execution failed:`, result.error);
        // Continue execution with undefined output
        outputs[node.id] = undefined;
        executed.add(node.id);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Node ${node.id} (${node.type}) error: ${errorMsg}`);
      console.error(`Node ${node.id} threw error:`, errorMsg);
      outputs[node.id] = undefined;
      executed.add(node.id);
    }
  }

  // Check for circular dependencies or stuck nodes
  if (queue.length > 0) {
    errors.push(`Workflow execution incomplete. ${queue.length} nodes could not execute (circular dependency?)`);
  }

  // Find output nodes
  const outputNodes = nodes.filter(n => n.type === "output");
  const finalOutputs: Record<string, unknown> = {};

  for (const outputNode of outputNodes) {
    const outputKey = outputNode.data.outputKey as string || outputNode.id;
    finalOutputs[outputKey] = outputs[outputNode.id];
  }

  return {
    status: errors.length > 0 ? "completed_with_errors" : "completed",
    outputs: Object.keys(finalOutputs).length > 0 ? finalOutputs : outputs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Removed - now using real executor from @/lib/workflow/node-executor

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
