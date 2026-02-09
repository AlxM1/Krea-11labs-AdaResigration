import { NextRequest, NextResponse } from "next/server";
import { getQueue, QueueNames, QueueName } from "@/lib/queue";

/**
 * GET /api/jobs/:id - Poll job status
 * Returns the current state of a queued job.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Try to find the job across all queues
    const queueNames: QueueName[] = [
      QueueNames.IMAGE_GENERATION,
      QueueNames.VIDEO_GENERATION,
      QueueNames.IMAGE_ENHANCEMENT,
      QueueNames.MODEL_TRAINING,
    ];

    for (const queueName of queueNames) {
      const queue = getQueue(queueName);
      if (!queue) continue;

      const job = await queue.getJob(jobId);
      if (!job) continue;

      const state = await job.getState();
      const progress = job.progress;

      return NextResponse.json({
        id: job.id,
        queue: queueName,
        state, // waiting, active, completed, failed, delayed
        progress: typeof progress === "number" ? progress : 0,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
      });
    }

    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
