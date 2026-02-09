import { NextResponse } from "next/server";
import { QueueNames, getQueueStats, isQueueAvailable } from "@/lib/queue";

/**
 * GET /api/jobs - Get queue statistics for all job queues
 */
export async function GET() {
  try {
    if (!isQueueAvailable()) {
      return NextResponse.json({
        available: false,
        message: "Queue system not available (Redis not connected)",
        queues: [],
      });
    }

    const stats = await Promise.all([
      getQueueStats(QueueNames.IMAGE_GENERATION),
      getQueueStats(QueueNames.VIDEO_GENERATION),
      getQueueStats(QueueNames.IMAGE_ENHANCEMENT),
      getQueueStats(QueueNames.MODEL_TRAINING),
      getQueueStats(QueueNames.NOTIFICATIONS),
    ]);

    return NextResponse.json({
      available: true,
      queues: stats.filter(Boolean),
    });
  } catch (error) {
    console.error("Queue stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
