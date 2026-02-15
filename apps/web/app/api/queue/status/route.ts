import { NextResponse } from "next/server";
import { getQueue, QueueNames, type QueueName } from "@/lib/queue";

export async function GET() {
  try {
    const queueDefs: { key: string; name: QueueName; type: string }[] = [
      { key: "image", name: QueueNames.IMAGE_GENERATION, type: "image" },
      { key: "video", name: QueueNames.VIDEO_GENERATION, type: "video" },
      { key: "enhancement", name: QueueNames.IMAGE_ENHANCEMENT, type: "enhancement" },
      { key: "logo", name: QueueNames.LOGO_GENERATION, type: "logo" },
      { key: "style", name: QueueNames.STYLE_TRANSFER, type: "style-transfer" },
      { key: "bgRemoval", name: QueueNames.BACKGROUND_REMOVAL, type: "bg-removal" },
    ];

    const queuesResult: Record<
      string,
      { active: number; waiting: number; completed: number; failed: number }
    > = {};
    const activeJobs: {
      id: string | number;
      type: string;
      prompt: string;
      progress?: number;
      timestamp: number;
    }[] = [];
    const waitingJobs: {
      id: string | number;
      type: string;
      prompt: string;
      timestamp: number;
    }[] = [];

    await Promise.all(
      queueDefs.map(async ({ key, name, type }) => {
        const queue = getQueue(name);
        if (!queue) {
          queuesResult[key] = { active: 0, waiting: 0, completed: 0, failed: 0 };
          return;
        }

        const [activeCount, waitingCount, completedCount, failedCount, active, waiting] =
          await Promise.all([
            queue.getActiveCount(),
            queue.getWaitingCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getActive(0, 10),
            queue.getWaiting(0, 10),
          ]);

        queuesResult[key] = {
          active: activeCount,
          waiting: waitingCount,
          completed: completedCount,
          failed: failedCount,
        };

        for (const job of active) {
          activeJobs.push({
            id: job.id ?? "",
            type,
            prompt: job.data?.prompt || job.data?.companyName || "Processing...",
            progress: typeof job.progress === "number" ? job.progress : undefined,
            timestamp: job.timestamp,
          });
        }

        for (const job of waiting) {
          waitingJobs.push({
            id: job.id ?? "",
            type,
            prompt: job.data?.prompt || job.data?.companyName || "Queued...",
            timestamp: job.timestamp,
          });
        }
      })
    );

    return NextResponse.json({
      queues: queuesResult,
      userJobs: {
        active: activeJobs,
        waiting: waitingJobs,
      },
    });
  } catch (error) {
    console.error("Queue status error:", error);
    return NextResponse.json({
      queues: {
        image: { active: 0, waiting: 0, completed: 0, failed: 0 },
        video: { active: 0, waiting: 0, completed: 0, failed: 0 },
      },
      userJobs: { active: [], waiting: [] },
    });
  }
}
