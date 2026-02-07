/**
 * Job Queue Infrastructure
 * Uses BullMQ with Redis for background job processing
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { getRedis } from "../redis";

// Queue names
export const QueueNames = {
  IMAGE_GENERATION: "image-generation",
  VIDEO_GENERATION: "video-generation",
  MODEL_TRAINING: "model-training",
  IMAGE_ENHANCEMENT: "image-enhancement",
  NOTIFICATIONS: "notifications",
  CLEANUP: "cleanup",
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

// Job data types
export interface ImageGenerationJob {
  userId: string;
  generationId: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed?: number;
}

export interface VideoGenerationJob {
  userId: string;
  videoId: string;
  prompt?: string;
  imageUrl?: string;
  model: string;
  duration: number;
  aspectRatio: string;
}

export interface ModelTrainingJob {
  userId: string;
  modelId: string;
  name: string;
  type: string;
  baseModel: string;
  triggerWord: string;
  images: string[];
  trainingSteps: number;
  learningRate: number;
  loraRank: number;
}

export interface ImageEnhancementJob {
  userId: string;
  generationId: string;
  imageUrl: string;
  scale: number;
  model: string;
  denoise?: number;
  faceEnhance?: boolean;
}

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Queue instances (lazy loaded)
const queues: Map<QueueName, Queue> = new Map();
const workers: Map<QueueName, Worker> = new Map();

/**
 * Check if queue system is available (Redis connected)
 */
export function isQueueAvailable(): boolean {
  return getRedis() !== null;
}

/**
 * Get or create a queue instance
 */
export function getQueue(name: QueueName): Queue | null {
  const redis = getRedis();
  if (!redis) {
    console.warn(`[Queue] Redis not available, cannot create queue: ${name}`);
    return null;
  }

  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });

    queues.set(name, queue);
  }

  return queues.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T>(
  queueName: QueueName,
  data: T,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<Job<T> | null> {
  const queue = getQueue(queueName);
  if (!queue) {
    return null;
  }

  return queue.add(queueName, data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  }) as Promise<Job<T>>;
}

/**
 * Create a worker for processing jobs
 */
export function createWorker<T>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<void>,
  options?: {
    concurrency?: number;
  }
): Worker | null {
  const redis = getRedis();
  if (!redis) {
    console.warn(`[Worker] Redis not available, cannot create worker: ${queueName}`);
    return null;
  }

  if (workers.has(queueName)) {
    return workers.get(queueName)!;
  }

  const worker = new Worker(
    queueName,
    async (job: Job<T>) => {
      console.log(`[Worker:${queueName}] Processing job ${job.id}`);
      try {
        await processor(job);
        console.log(`[Worker:${queueName}] Completed job ${job.id}`);
      } catch (error) {
        console.error(`[Worker:${queueName}] Failed job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: options?.concurrency || 1,
    }
  );

  worker.on("failed", (job, error) => {
    console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error(`[Worker:${queueName}] Worker error:`, error.message);
  });

  workers.set(queueName, worker);
  return worker;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(queueName: QueueName): QueueEvents | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return new QueueEvents(queueName, { connection: redis });
}

/**
 * Close all queues and workers gracefully
 */
export async function closeAll(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const worker of Array.from(workers.values())) {
    closePromises.push(worker.close());
  }

  for (const queue of Array.from(queues.values())) {
    closePromises.push(queue.close());
  }

  await Promise.all(closePromises);

  queues.clear();
  workers.clear();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: QueueName) {
  const queue = getQueue(queueName);
  if (!queue) {
    return null;
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}
