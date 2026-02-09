/**
 * POST /api/integrations/whisperflow/transcribe
 * Transcribe audio to text
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWhisperFlowClient, checkWhisperFlowHealth } from '@/lib/integrations/whisperflow-client';

const transcribeSchema = z.object({
  audioUrl: z.string().url().optional(),
  audioData: z.string().optional(), // Base64 encoded audio
  language: z.string().optional(),
  prompt: z.string().optional(),
}).refine(data => data.audioUrl || data.audioData, {
  message: 'Either audioUrl or audioData is required',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = transcribeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Check if WhisperFlow is available
    const isAvailable = await checkWhisperFlowHealth();
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'WhisperFlow not available',
          message: 'Configure WHISPERFLOW_URL to enable voice-to-text',
        },
        { status: 503 }
      );
    }

    const client = getWhisperFlowClient();

    // Transcribe audio
    const result = await client.transcribe({
      audioUrl: params.audioUrl,
      audioData: params.audioData,
      language: params.language,
      prompt: params.prompt,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('WhisperFlow transcription error:', error);

    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/whisperflow/transcribe
 * Get supported languages
 */
export async function GET() {
  try {
    const isAvailable = await checkWhisperFlowHealth();
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'WhisperFlow not available',
          languages: ['auto', 'en'],
        },
        { status: 503 }
      );
    }

    const client = getWhisperFlowClient();
    const languages = await client.getSupportedLanguages();

    return NextResponse.json({
      languages,
      available: true,
    });
  } catch (error) {
    console.error('Error fetching languages:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch languages',
        languages: ['auto', 'en'],
      },
      { status: 500 }
    );
  }
}
