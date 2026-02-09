/**
 * POST /api/llm/suggest-styles
 * Suggest art styles based on prompt using LLM
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
          message: 'Configure NVIDIA_API_KEY, TOGETHER_API_KEY, or OLLAMA_URL to enable style suggestions',
          suggestions: [],
        },
        { status: 503 }
      );
    }

    const llmClient = getLLMClient();
    const suggestions = await llmClient.suggestStyles(prompt);

    return NextResponse.json({
      prompt,
      suggestions,
      success: true,
    });
  } catch (error) {
    console.error('Style suggestion error:', error);

    return NextResponse.json(
      {
        error: 'Failed to suggest styles',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
