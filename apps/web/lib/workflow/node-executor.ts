/**
 * Workflow Node Executor
 * Executes individual workflow nodes with real AI generation
 */

import { generateImage } from "../ai/providers";
import { executeImageChain } from "../ai/provider-chain";

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface NodeExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Execute a single workflow node
 */
export async function executeNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  try {
    console.log(`Executing node ${node.id} (${node.type})`);

    let output: unknown;

    switch (node.type) {
      case "input":
      case "text-input":
        output = node.data.value || inputs.input || node.data.defaultValue;
        break;

      case "image-input":
        output = node.data.imageUrl || inputs.input;
        break;

      case "text-to-image":
      case "generate-image":
        output = await executeTextToImage(node, inputs);
        break;

      case "image-to-image":
        output = await executeImageToImage(node, inputs);
        break;

      case "upscale":
        output = await executeUpscale(node, inputs);
        break;

      case "remove-background":
        output = await executeRemoveBackground(node, inputs);
        break;

      case "style-transfer":
        output = await executeStyleTransfer(node, inputs);
        break;

      case "inpaint":
        output = await executeInpaint(node, inputs);
        break;

      case "merge":
        output = Object.values(inputs);
        break;

      case "conditional":
        output = await executeConditional(node, inputs);
        break;

      case "loop":
        output = await executeLoop(node, inputs, context);
        break;

      case "output":
        output = inputs.input || Object.values(inputs)[0];
        break;

      default:
        console.warn(`Unknown node type: ${node.type}`);
        output = inputs;
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      output,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`Node ${node.id} execution failed:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Execute text-to-image generation node
 */
async function executeTextToImage(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const prompt = (inputs.prompt as string) || (node.data.prompt as string) || "";
  const negativePrompt = (inputs.negativePrompt as string) || (node.data.negativePrompt as string);
  const model = (node.data.model as string) || "flux-schnell";
  const width = (node.data.width as number) || 1024;
  const height = (node.data.height as number) || 1024;
  const steps = (node.data.steps as number) || 4;
  const cfgScale = (node.data.cfgScale as number) || 7.5;
  const seed = (node.data.seed as number) || 0;

  if (!prompt) {
    throw new Error("Text-to-image node requires a prompt");
  }

  const result = await executeImageChain(
    "text-to-image",
    {
      prompt,
      negativePrompt,
      model,
      width,
      height,
      steps,
      cfgScale,
      seed: seed > 0 ? seed : undefined,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Image generation failed");
  }

  const imageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;
  const images = 'images' in result.result ? result.result.images : undefined;
  const resultSeed = 'seed' in result.result ? result.result.seed : undefined;

  return {
    imageUrl,
    images,
    seed: resultSeed,
  };
}

/**
 * Execute image-to-image node
 */
async function executeImageToImage(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const imageUrl = (inputs.image as string) || (node.data.imageUrl as string);
  const prompt = (inputs.prompt as string) || (node.data.prompt as string) || "";
  const strength = (node.data.strength as number) || 0.7;

  if (!imageUrl) {
    throw new Error("Image-to-image node requires an input image");
  }

  if (!prompt) {
    throw new Error("Image-to-image node requires a prompt");
  }

  const result = await executeImageChain(
    "image-to-image",
    {
      prompt,
      imageUrl,
      strength,
      model: "flux-dev",
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Image-to-image generation failed");
  }

  const resultImageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;

  return {
    imageUrl: resultImageUrl,
  };
}

/**
 * Execute upscale node
 */
async function executeUpscale(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const imageUrl = (inputs.image as string) || (node.data.imageUrl as string);
  const scale = (node.data.scale as number) || 2;

  if (!imageUrl) {
    throw new Error("Upscale node requires an input image");
  }

  const result = await executeImageChain(
    "upscale",
    {
      prompt: `upscale ${scale}x`,
      imageUrl,
      width: 1024 * scale,
      height: 1024 * scale,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Upscale failed");
  }

  const resultImageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;

  return {
    imageUrl: resultImageUrl,
    scale,
  };
}

/**
 * Execute remove background node
 */
async function executeRemoveBackground(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const imageUrl = (inputs.image as string) || (node.data.imageUrl as string);

  if (!imageUrl) {
    throw new Error("Remove background node requires an input image");
  }

  const result = await executeImageChain(
    "background-removal",
    {
      prompt: "remove background",
      imageUrl,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Background removal failed");
  }

  const resultImageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;

  return {
    imageUrl: resultImageUrl,
  };
}

/**
 * Execute style transfer node
 */
async function executeStyleTransfer(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const imageUrl = (inputs.image as string) || (node.data.imageUrl as string);
  const styleUrl = (inputs.style as string) || (node.data.styleUrl as string);
  const strength = (node.data.strength as number) || 0.7;

  if (!imageUrl) {
    throw new Error("Style transfer node requires an input image");
  }

  const result = await executeImageChain(
    "style-transfer",
    {
      prompt: "style transfer",
      imageUrl,
      strength,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Style transfer failed");
  }

  const resultImageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;

  return {
    imageUrl: resultImageUrl,
  };
}

/**
 * Execute inpaint node
 */
async function executeInpaint(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const imageUrl = (inputs.image as string) || (node.data.imageUrl as string);
  const maskUrl = (inputs.mask as string) || (node.data.maskUrl as string);
  const prompt = (inputs.prompt as string) || (node.data.prompt as string) || "";

  if (!imageUrl) {
    throw new Error("Inpaint node requires an input image");
  }

  if (!maskUrl) {
    throw new Error("Inpaint node requires a mask");
  }

  const result = await executeImageChain(
    "inpaint",
    {
      prompt,
      imageUrl,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || "Inpaint failed");
  }

  const resultImageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;

  return {
    imageUrl: resultImageUrl,
  };
}

/**
 * Execute conditional node
 */
async function executeConditional(
  node: WorkflowNode,
  inputs: Record<string, unknown>
): Promise<unknown> {
  const condition = (inputs.condition as boolean) || false;
  const trueValue = inputs.true;
  const falseValue = inputs.false;

  return condition ? trueValue : falseValue;
}

/**
 * Execute loop node (limited iterations to prevent infinite loops)
 */
async function executeLoop(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
  context: NodeExecutionContext
): Promise<unknown> {
  const iterations = Math.min((node.data.iterations as number) || 1, 10); // Max 10 iterations
  const results: unknown[] = [];

  for (let i = 0; i < iterations; i++) {
    // In a full implementation, we'd execute the connected subgraph
    // For now, just pass through the input
    results.push(inputs.input);
  }

  return results;
}
