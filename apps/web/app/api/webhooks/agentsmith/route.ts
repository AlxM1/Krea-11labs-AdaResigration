/**
 * POST /api/webhooks/agentsmith
 * Webhook receiver for AgentSmith workflow triggers
 * Requires WEBHOOK_SECRET authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { executeImageChain, executeVideoChain } from '@/lib/ai/provider-chain';
import { generateImage, generateVideo } from '@/lib/ai/providers';
import { getAgentSmithClient } from '@/lib/integrations/agentsmith-client';

// Webhook secret authentication
function validateWebhookSecret(req: NextRequest): boolean {
  const secret = req.headers.get('X-Webhook-Secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.warn('WEBHOOK_SECRET not configured');
    return false;
  }

  return secret === expectedSecret;
}

const webhookRequestSchema = z.object({
  workflowId: z.string(),
  executionId: z.string(),
  action: z.enum(['generate-image', 'generate-video', 'generate-batch']),
  params: z.object({
    prompt: z.string().optional(),
    negativePrompt: z.string().optional(),
    model: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    steps: z.number().optional(),
    imageUrl: z.string().optional(),
    duration: z.number().optional(),
    count: z.number().optional(),
  }),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate webhook request
    if (!validateWebhookSecret(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook secret' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = webhookRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Process webhook asynchronously
    processAgentSmithWebhook(params).catch(error => {
      console.error('AgentSmith webhook processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      workflowId: params.workflowId,
      executionId: params.executionId,
      status: 'processing',
      message: 'Webhook received. Callback will be sent when complete.',
    });
  } catch (error) {
    console.error('AgentSmith webhook error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process AgentSmith webhook and send callback
 */
async function processAgentSmithWebhook(
  params: z.infer<typeof webhookRequestSchema>
): Promise<void> {
  const agentSmithClient = getAgentSmithClient();

  try {
    console.log(`Processing AgentSmith webhook for workflow ${params.workflowId}`);

    let result: Record<string, unknown> = {};

    switch (params.action) {
      case 'generate-image':
        result = await processImageGeneration(params);
        break;

      case 'generate-video':
        result = await processVideoGeneration(params);
        break;

      case 'generate-batch':
        result = await processBatchGeneration(params);
        break;

      default:
        throw new Error(`Unknown action: ${params.action}`);
    }

    // Send success callback
    await agentSmithClient.sendCallback({
      workflowId: params.workflowId,
      executionId: params.executionId,
      status: 'completed',
      result: {
        outputs: result,
      },
    });

    console.log(`AgentSmith webhook completed for workflow ${params.workflowId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Send failure callback
    await agentSmithClient.sendCallback({
      workflowId: params.workflowId,
      executionId: params.executionId,
      status: 'failed',
      result: {
        error: errorMessage,
      },
    });

    console.error(`AgentSmith webhook failed for workflow ${params.workflowId}:`, errorMessage);
  }
}

/**
 * Process image generation
 */
async function processImageGeneration(
  params: z.infer<typeof webhookRequestSchema>
): Promise<Record<string, unknown>> {
  if (!params.params.prompt) {
    throw new Error('Prompt is required for image generation');
  }

  const result = await executeImageChain(
    'text-to-image',
    {
      prompt: params.params.prompt,
      negativePrompt: params.params.negativePrompt,
      model: params.params.model,
      width: params.params.width || 1024,
      height: params.params.height || 1024,
      steps: params.params.steps || 4,
    },
    (provider, request) => generateImage(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || 'Image generation failed');
  }

  const imageUrl = 'imageUrl' in result.result ? result.result.imageUrl : undefined;
  const images = 'images' in result.result ? result.result.images : undefined;
  const seed = 'seed' in result.result ? result.result.seed : undefined;

  // Store generation in database
  await prisma.generation.create({
    data: {
      userId: 'agentsmith-service',
      type: 'TEXT_TO_IMAGE',
      prompt: params.params.prompt,
      negativePrompt: params.params.negativePrompt,
      model: params.params.model || 'flux-schnell',
      status: 'COMPLETED',
      imageUrl,
      width: params.params.width || 1024,
      height: params.params.height || 1024,
      parameters: {
        workflowId: params.workflowId,
        executionId: params.executionId,
        source: 'agentsmith-webhook',
        metadata: params.metadata,
      },
    },
  });

  return {
    imageUrl,
    images,
    seed,
  };
}

/**
 * Process video generation
 */
async function processVideoGeneration(
  params: z.infer<typeof webhookRequestSchema>
): Promise<Record<string, unknown>> {
  if (!params.params.prompt && !params.params.imageUrl) {
    throw new Error('Prompt or imageUrl is required for video generation');
  }

  const result = await executeVideoChain(
    {
      prompt: params.params.prompt || '',
      imageUrl: params.params.imageUrl,
      duration: params.params.duration || 5,
    },
    (provider, request) => generateVideo(request, provider)
  );

  if (!result.success || !result.result) {
    throw new Error(result.finalError || 'Video generation failed');
  }

  const videoUrl = 'videoUrl' in result.result ? result.result.videoUrl : undefined;
  const thumbnailUrl = 'thumbnailUrl' in result.result ? result.result.thumbnailUrl : undefined;

  // Store video in database
  await prisma.video.create({
    data: {
      userId: 'agentsmith-service',
      type: params.params.imageUrl ? 'IMAGE_TO_VIDEO' : 'TEXT_TO_VIDEO',
      prompt: params.params.prompt,
      model: params.params.model || 'runway',
      status: 'COMPLETED',
      videoUrl,
      durationSeconds: params.params.duration || 5,
      parameters: {
        workflowId: params.workflowId,
        executionId: params.executionId,
        source: 'agentsmith-webhook',
        metadata: params.metadata,
      },
    },
  });

  return {
    videoUrl,
    thumbnailUrl,
  };
}

/**
 * Process batch generation
 */
async function processBatchGeneration(
  params: z.infer<typeof webhookRequestSchema>
): Promise<Record<string, unknown>> {
  const count = Math.min(params.params.count || 1, 10); // Max 10 per batch
  const results: unknown[] = [];

  for (let i = 0; i < count; i++) {
    const result = await processImageGeneration(params);
    results.push(result);
  }

  return {
    count: results.length,
    results,
  };
}

/**
 * GET /api/webhooks/agentsmith
 * Get webhook endpoint information
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate webhook request
    if (!validateWebhookSecret(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook secret' },
        { status: 401 }
      );
    }

    const agentSmithClient = getAgentSmithClient();
    const isAvailable = await agentSmithClient.isAvailable();

    return NextResponse.json({
      service: 'krya',
      endpoint: '/api/webhooks/agentsmith',
      status: 'operational',
      agentSmithAvailable: isAvailable,
      supportedActions: [
        'generate-image',
        'generate-video',
        'generate-batch',
      ],
    });
  } catch (error) {
    console.error('Error checking webhook status:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
