/**
 * POST /api/llm/enhance-prompt
 * Enhance a prompt for image generation using LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLLMClient, hasLLMSupport } from '@/lib/llm/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if LLM support is available
    const hasSupport = await hasLLMSupport();
    if (!hasSupport) {
      return NextResponse.json(
        {
          error: 'No LLM providers configured',
          message: 'Configure NVIDIA_API_KEY, TOGETHER_API_KEY, or OLLAMA_URL to enable prompt enhancement',
          enhancedPrompt: prompt, // Return original as fallback
        },
        { status: 503 }
      );
    }

    const llmClient = getLLMClient();
    const enhancedPrompt = await llmClient.enhancePrompt(prompt);

    return NextResponse.json({
      prompt,
      enhancedPrompt,
      success: true,
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);

    return NextResponse.json(
      {
        error: 'Failed to enhance prompt',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
