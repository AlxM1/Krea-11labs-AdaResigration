/**
 * POST /api/llm/caption-image
 * Caption an image for img2img workflows using vision models
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTogetherLLMProvider, checkTogetherLLMHealth } from '@/lib/llm/together-llm';
import { OllamaProvider, checkOllamaHealth } from '@/lib/ai/ollama-provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, imageBase64 } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'imageUrl or imageBase64 is required' },
        { status: 400 }
      );
    }

    let caption = '';

    // Try Together AI vision model first (supports URLs)
    if (imageUrl && await checkTogetherLLMHealth()) {
      try {
        const togetherProvider = getTogetherLLMProvider();
        caption = await togetherProvider.captionImage(imageUrl);
      } catch (error) {
        console.error('Together AI vision failed:', error);
      }
    }

    // Fallback to Ollama llava (requires base64)
    if (!caption && imageBase64 && await checkOllamaHealth()) {
      try {
        const ollamaProvider = new OllamaProvider();
        caption = await ollamaProvider.describeImage(
          imageBase64,
          'Describe this image in detail for use as a prompt in AI image generation. Focus on: subject, style, composition, colors, lighting, and mood.'
        );
      } catch (error) {
        console.error('Ollama vision failed:', error);
      }
    }

    if (!caption) {
      return NextResponse.json(
        {
          error: 'No vision models available',
          message: 'Configure TOGETHER_API_KEY or OLLAMA_URL (with llava model) to enable image captioning',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      caption,
      success: true,
    });
  } catch (error) {
    console.error('Image captioning error:', error);

    return NextResponse.json(
      {
        error: 'Failed to caption image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
