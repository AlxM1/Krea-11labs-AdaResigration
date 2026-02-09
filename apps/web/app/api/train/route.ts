import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addJob, isQueueAvailable, QueueNames, ModelTrainingJob } from "@/lib/queue";
import { z } from "zod";

// Default user ID for personal use (no auth required)
const PERSONAL_USER_ID = "personal-user";

const createTrainingSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"]).default("LORA"),
  baseModel: z.enum(["flux-dev", "sdxl", "sd15"]).default("flux-dev"),
  triggerWord: z.string().min(1).max(50),
  images: z.array(z.string().url()).min(5).max(50),
  trainingSteps: z.number().min(500).max(5000).default(1500),
  learningRate: z.number().min(0.00001).max(0.001).default(0.0001),
  loraRank: z.number().min(4).max(128).default(32),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createTrainingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const params = validated.data;

    // Create trained model record
    const trainedModel = await prisma.trainedModel.create({
      data: {
        userId: PERSONAL_USER_ID,
        name: params.name,
        type: params.type,
        baseModel: params.baseModel,
        triggerWord: params.triggerWord,
        status: "PENDING",
        trainingConfig: {
          steps: params.trainingSteps,
          learningRate: params.learningRate,
          loraRank: params.loraRank,
          imageCount: params.images.length,
        },
        description: params.description,
        isPublic: params.isPublic,
      },
    });

    // Queue the training job
    if (isQueueAvailable()) {
      const job = await addJob<ModelTrainingJob>(
        QueueNames.MODEL_TRAINING,
        {
          userId: PERSONAL_USER_ID,
          modelId: trainedModel.id,
          name: params.name,
          type: params.type,
          baseModel: params.baseModel,
          triggerWord: params.triggerWord,
          images: params.images,
          trainingSteps: params.trainingSteps,
          learningRate: params.learningRate,
          loraRank: params.loraRank,
        },
        { jobId: `train-${trainedModel.id}` }
      );

      await prisma.trainedModel.update({
        where: { id: trainedModel.id },
        data: {
          status: "QUEUED",
          trainingConfig: {
            ...(trainedModel.trainingConfig as object),
            jobId: job?.id,
            queuedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        id: trainedModel.id,
        name: trainedModel.name,
        status: "queued",
        jobId: job?.id,
        estimatedTime: estimateTrainingTime(params.trainingSteps, params.images.length),
        message: "Training job queued. Poll /api/jobs/{id} for status.",
      });
    }

    // No queue available - return pending status
    return NextResponse.json({
      id: trainedModel.id,
      name: trainedModel.name,
      status: "pending",
      estimatedTime: estimateTrainingTime(params.trainingSteps, params.images.length),
      message: "Training created but queue unavailable. Configure Redis to enable background training.",
    });
  } catch (error) {
    console.error("Training creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function estimateTrainingTime(steps: number, imageCount: number): string {
  // Rough estimate: 1 step takes ~0.5 seconds on A100
  const minutes = Math.ceil((steps * 0.5) / 60);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: PERSONAL_USER_ID };
    if (status) {
      where.status = status.toUpperCase();
    }

    const models = await prisma.trainedModel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.trainedModel.count({ where });

    return NextResponse.json({ models, total, limit, offset });
  } catch (error) {
    console.error("Error fetching trained models:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
