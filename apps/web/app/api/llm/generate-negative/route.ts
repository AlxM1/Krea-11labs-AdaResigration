/**
 * POST /api/llm/generate-negative
 * Generate negative prompt using LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLLMClient, hasLLMSupport } from '@/lib/llm/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if LLM support is available
    const hasSupport = await hasLLMSupport();
    if (!hasSupport) {
      // Return default negative prompt as fallback
      const defaultNegative = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, poorly drawn, watermark, signature, text';

      return NextResponse.json({
        negativePrompt: defaultNegative,
        success: true,
        fallback: true,
      });
    }

    const llmClient = getLLMClient();
    const negativePrompt = await llmClient.generateNegativePrompt(prompt, style);

    return NextResponse.json({
      prompt,
      style,
      negativePrompt,
      success: true,
    });
  } catch (error) {
    console.error('Negative prompt generation error:', error);

    // Return default negative prompt on error
    const defaultNegative = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, poorly drawn';

    return NextResponse.json({
      negativePrompt: defaultNegative,
      success: true,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
