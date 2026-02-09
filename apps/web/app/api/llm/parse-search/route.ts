/**
 * POST /api/llm/parse-search
 * Parse natural language search query into filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLLMClient, hasLLMSupport } from '@/lib/llm/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Check if LLM support is available
    const hasSupport = await hasLLMSupport();
    if (!hasSupport) {
      return NextResponse.json(
        {
          error: 'No LLM providers configured',
          message: 'Configure NVIDIA_API_KEY, TOGETHER_API_KEY, or OLLAMA_URL to enable smart search',
          filters: {},
        },
        { status: 503 }
      );
    }

    const llmClient = getLLMClient();
    const filters = await llmClient.parseSearchQuery(query);

    return NextResponse.json({
      query,
      filters,
      success: true,
    });
  } catch (error) {
    console.error('Search parsing error:', error);

    return NextResponse.json(
      {
        error: 'Failed to parse search query',
        message: error instanceof Error ? error.message : 'Unknown error',
        filters: {},
      },
      { status: 500 }
    );
  }
}
