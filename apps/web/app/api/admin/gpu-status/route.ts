/**
 * GET /api/admin/gpu-status
 * Get GPU server status and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkComfyUIHealth, getComfyUIModels, getComfyUIConfig } from '@/lib/ai/comfyui-provider';

export async function GET(req: NextRequest) {
  try {
    const config = getComfyUIConfig();
    const isAvailable = await checkComfyUIHealth();

    if (!isAvailable) {
      return NextResponse.json({
        available: false,
        configured: !!(process.env.COMFYUI_URL || process.env.GPU_SERVER_HOST),
        message: process.env.COMFYUI_URL || process.env.GPU_SERVER_HOST
          ? 'GPU server configured but not reachable'
          : 'GPU server not configured. Set COMFYUI_URL or GPU_SERVER_HOST to enable local generation.',
        baseUrl: config.baseUrl,
      });
    }

    // Get system stats
    let systemStats: Record<string, unknown> = {};
    try {
      const statsResponse = await fetch(`${config.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });
      if (statsResponse.ok) {
        systemStats = await statsResponse.json();
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }

    // Get available models
    const models = await getComfyUIModels();

    // Get queue status
    let queueInfo: Record<string, unknown> = {};
    try {
      const queueResponse = await fetch(`${config.baseUrl}/queue`, {
        signal: AbortSignal.timeout(5000),
      });
      if (queueResponse.ok) {
        queueInfo = await queueResponse.json();
      }
    } catch (error) {
      console.error('Failed to fetch queue info:', error);
    }

    return NextResponse.json({
      available: true,
      configured: true,
      baseUrl: config.baseUrl,
      systemStats,
      models: {
        checkpoints: models.checkpoints.length,
        loras: models.loras.length,
        vaes: models.vaes.length,
        availableCheckpoints: models.checkpoints.slice(0, 10), // First 10
      },
      queue: {
        running: (queueInfo as { queue_running?: unknown[] }).queue_running?.length || 0,
        pending: (queueInfo as { queue_pending?: unknown[] }).queue_pending?.length || 0,
      },
      features: {
        textToImage: true,
        imageToImage: true,
        videoGeneration: models.checkpoints.some(m =>
          m.includes('cogvideo') || m.includes('svd') || m.includes('hunyuan') || m.includes('ltx')
        ),
        upscale: true,
        inpainting: true,
      },
    });
  } catch (error) {
    console.error('GPU status error:', error);

    return NextResponse.json(
      {
        available: false,
        configured: !!(process.env.COMFYUI_URL || process.env.GPU_SERVER_HOST),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
