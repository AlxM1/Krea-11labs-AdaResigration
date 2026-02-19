/**
 * POST /api/internal/newsletter/generate
 * Internal endpoint for Newsletter Pipeline to request generation
 * Requires INTERNAL_API_KEY authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { executeImageChain } from '@/lib/ai/provider-chain';
import { generateImage } from '@/lib/ai/providers';
import { getNewsletterClient } from '@/lib/integrations/newsletter-client';
import { validateUrl } from '@/lib/security';

// Internal API key authentication
function validateInternalApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('X-Internal-API-Key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey || !apiKey) {
    console.warn('INTERNAL_API_KEY not configured or missing from request');
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(expectedKey)
    );
  } catch {
    // timingSafeEqual throws if buffer lengths differ
    return false;
  }
}

const generateRequestSchema = z.object({
  requestId: z.string(),
  type: z.enum(['image', 'video']),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  steps: z.number().optional(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate internal request
    if (!validateInternalApiKey(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = generateRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Validate callbackUrl to prevent SSRF attacks
    if (params.callbackUrl && !validateUrl(params.callbackUrl)) {
      return NextResponse.json(
        { error: 'Invalid callback URL. URL must be HTTPS and cannot point to private networks or cloud metadata endpoints.' },
        { status: 400 }
      );
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: 'newsletter-service', // Special user ID for internal services
        type: 'TEXT_TO_IMAGE',
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model || 'flux-schnell',
        status: 'PROCESSING',
        width: params.width || 1024,
        height: params.height || 1024,
        parameters: {
          requestId: params.requestId,
          source: 'newsletter-pipeline',
          metadata: params.metadata,
        },
      },
    });

    // Process generation asynchronously
    processNewsletterGeneration(params, generation.id).catch(error => {
      console.error('Newsletter generation processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      requestId: params.requestId,
      status: 'processing',
      message: 'Generation queued. Callback will be sent when complete.',
    });
  } catch (error) {
    console.error('Newsletter generation error:', error);

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
 * Process newsletter generation and send callback
 */
async function processNewsletterGeneration(
  params: z.infer<typeof generateRequestSchema>,
  generationId: string
): Promise<void> {
  const newsletterClient = getNewsletterClient();

  try {
    console.log(`Processing newsletter generation for request ${params.requestId}`);

    // Generate image using provider chain
    const result = await executeImageChain(
      'text-to-image',
      {
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model,
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 4,
      },
      (provider, request) => generateImage(request, provider)
    );

    if (!result.success || !result.result) {
      throw new Error(result.finalError || 'Generation failed');
    }

    // Update generation record
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'COMPLETED',
        imageUrl: 'imageUrl' in result.result ? result.result.imageUrl : undefined,
        parameters: {
          ...(await prisma.generation.findUnique({ where: { id: generationId } }).then(g => g?.parameters as object || {})),
          attempts: result.attempts.map(a => ({
            provider: a.provider,
            success: a.success,
            duration: a.duration,
          })),
        },
      },
    });

    // Send callback to Newsletter Pipeline
    await newsletterClient.sendCallback({
      requestId: params.requestId,
      status: 'completed',
      result: {
        imageUrl: 'imageUrl' in result.result ? result.result.imageUrl : undefined,
        videoUrl: 'videoUrl' in result.result ? result.result.videoUrl : undefined,
      },
    });

    console.log(`Newsletter generation completed for request ${params.requestId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update generation as failed
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'FAILED',
      },
    });

    // Send failure callback
    await newsletterClient.sendCallback({
      requestId: params.requestId,
      status: 'failed',
      result: {
        error: errorMessage,
      },
    });

    console.error(`Newsletter generation failed for request ${params.requestId}:`, errorMessage);
  }
}

/**
 * GET /api/internal/newsletter/generate
 * Get status of newsletter service integration
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate internal request
    if (!validateInternalApiKey(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const newsletterClient = getNewsletterClient();
    const isAvailable = await newsletterClient.isAvailable();

    return NextResponse.json({
      service: 'krya',
      status: 'operational',
      newsletterPipelineAvailable: isAvailable,
      features: ['image-generation', 'video-generation'],
    });
  } catch (error) {
    console.error('Error checking status:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
