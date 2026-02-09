/**
 * POST /api/integrations/voiceforge/narrate
 * Add AI narration to a video
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getVoiceForgeClient, checkVoiceForgeHealth } from '@/lib/integrations/voiceforge-client';

const narrateSchema = z.object({
  videoUrl: z.string().url(),
  script: z.string().optional(),
  prompt: z.string().optional(),
  voice: z.string().optional(),
  duration: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = narrateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Check if VoiceForge is available
    const isAvailable = await checkVoiceForgeHealth();
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'VoiceForge not available',
          message: 'Configure VOICEFORGE_URL to enable video narration',
        },
        { status: 503 }
      );
    }

    const client = getVoiceForgeClient();

    // Generate script if not provided
    let script = params.script;
    if (!script && params.prompt) {
      script = await client.generateNarrationScript(
        params.prompt,
        params.duration || 10
      );
    }

    if (!script) {
      return NextResponse.json(
        { error: 'Either script or prompt is required' },
        { status: 400 }
      );
    }

    // Generate TTS audio
    const ttsResult = await client.generateTTS({
      text: script,
      voice: params.voice,
      format: 'mp3',
    });

    // Merge audio with video
    const videoWithNarration = await client.addNarrationToVideo(
      params.videoUrl,
      ttsResult.audioUrl
    );

    return NextResponse.json({
      success: true,
      videoUrl: videoWithNarration,
      audioUrl: ttsResult.audioUrl,
      script,
      duration: ttsResult.duration,
    });
  } catch (error) {
    console.error('VoiceForge narration error:', error);

    return NextResponse.json(
      {
        error: 'Failed to add narration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/voiceforge/narrate
 * Get available voices
 */
export async function GET() {
  try {
    const isAvailable = await checkVoiceForgeHealth();
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'VoiceForge not available',
          voices: [],
        },
        { status: 503 }
      );
    }

    const client = getVoiceForgeClient();
    const voices = await client.getVoices();

    return NextResponse.json({
      voices,
      available: true,
    });
  } catch (error) {
    console.error('Error fetching voices:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch voices',
        voices: [],
      },
      { status: 500 }
    );
  }
}
