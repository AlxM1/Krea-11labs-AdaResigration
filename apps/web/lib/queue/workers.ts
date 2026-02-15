/**
 * BullMQ Worker Processors
 * Handles background job processing for image/video generation, enhancement, and training.
 */

import { Job } from "bullmq";
import { prisma } from "../db";
import { generateImage, generateVideo, AIProvider } from "../ai/providers";
import { upscaleImage, enhanceFaces } from "../ai/enhance";
import { uploadFromUrl } from "../storage/upload";
import { emitJobComplete, emitToUser } from "../socket-emitter";
import {
  QueueNames,
  createWorker,
  ImageGenerationJob,
  VideoGenerationJob,
  ImageEnhancementJob,
  ModelTrainingJob,
  BackgroundRemovalJob,
  LogoGenerationJob,
  StyleTransferJob,
  NotificationJob,
  addJob,
} from "./index";

/**
 * Process image generation jobs
 */
async function processImageGeneration(job: Job<ImageGenerationJob>): Promise<void> {
  const { generationId, prompt, negativePrompt, model, width, height, steps, cfgScale, seed } = job.data;

  // Determine provider from job data or default
  const provider: AIProvider = (job.data as ImageGenerationJob & { provider?: AIProvider }).provider || "fal";

  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "PROCESSING" },
    });

    const result = await generateImage(
      { prompt, negativePrompt, width, height, steps, cfgScale, seed, model },
      provider
    );

    if (result.status === "failed" || !result.imageUrl) {
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          parameters: { error: result.error || "Generation failed" },
        },
      });

      // Notify user of failure
      await addJob(QueueNames.NOTIFICATIONS, {
        userId: job.data.userId,
        type: "generation_complete",
        title: "Generation Failed",
        message: result.error || "Image generation failed",
        data: { generationId },
      } satisfies NotificationJob);
      return;
    }

    // Upload to our storage
    let finalImageUrl = result.imageUrl;
    try {
      const uploaded = await uploadFromUrl(result.imageUrl, job.data.userId);
      finalImageUrl = uploaded.url;
    } catch {
      // Use provider URL directly if upload fails
    }

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "COMPLETED",
        imageUrl: finalImageUrl,
        thumbnailUrl: finalImageUrl,
        seed: result.seed ? BigInt(result.seed) : null,
      },
    });

    // Push real-time notification via WebSocket
    emitJobComplete(job.data.userId, {
      type: "image",
      generationId,
      imageUrl: finalImageUrl,
      status: "completed",
      title: "Image Ready",
      message: `Your image "${prompt.slice(0, 50)}..." is ready`,
    });

    await addJob(QueueNames.NOTIFICATIONS, {
      userId: job.data.userId,
      type: "generation_complete",
      title: "Image Ready",
      message: `Your image "${prompt.slice(0, 50)}..." is ready`,
      data: { generationId, imageUrl: finalImageUrl },
    } satisfies NotificationJob);
  } catch (error) {
    // Push failure via WebSocket
    emitJobComplete(job.data.userId, {
      type: "image",
      generationId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      title: "Generation Failed",
      message: "Image generation failed",
    });

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "FAILED",
        parameters: { error: error instanceof Error ? error.message : "Unknown error" },
      },
    });
    throw error; // Let BullMQ handle retry
  }
}

/**
 * Process video generation jobs
 */
async function processVideoGeneration(job: Job<VideoGenerationJob>): Promise<{ id: string; videoUrl?: string; status: string; error?: string }> {
  const { videoId, prompt, imageUrl, model, duration, aspectRatio, userId } = job.data;

  const provider: AIProvider = (job.data as VideoGenerationJob & { provider?: AIProvider }).provider || "fal";

  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "PROCESSING" },
    });

    await job.updateProgress(10);

    const result = await generateVideo(
      { prompt: prompt || "", imageUrl, duration, aspectRatio, model },
      provider
    );

    await job.updateProgress(80);

    if (result.status === "failed") {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "FAILED" },
      });

      await addJob(QueueNames.NOTIFICATIONS, {
        userId,
        type: "generation_complete",
        title: "Video Failed",
        message: result.error || "Video generation failed",
        data: { videoId },
      } satisfies NotificationJob);

      return { id: videoId, status: "failed", error: result.error };
    }

    // Download and save video to our storage (like image worker does)
    let finalVideoUrl = result.videoUrl;
    if (result.videoUrl) {
      try {
        console.log('[Video Worker] Downloading video from:', result.videoUrl);
        const uploaded = await uploadFromUrl(result.videoUrl, userId);
        finalVideoUrl = uploaded.url;
        console.log('[Video Worker] Video saved to:', finalVideoUrl);
      } catch (error) {
        console.error('[Video Worker] Failed to download video:', error);
        // Use provider URL directly if upload fails
        console.log('[Video Worker] Using provider URL directly:', result.videoUrl);
      }
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
        videoUrl: finalVideoUrl,
      },
    });

    if (result.status === "completed") {
      emitJobComplete(userId, {
        type: "video",
        videoId,
        videoUrl: finalVideoUrl,
        status: "completed",
        title: "Video Ready",
        message: "Your video is ready",
      });

      await addJob(QueueNames.NOTIFICATIONS, {
        userId,
        type: "generation_complete",
        title: "Video Ready",
        message: `Your video is ready`,
        data: { videoId, videoUrl: finalVideoUrl },
      } satisfies NotificationJob);
    }

    await job.updateProgress(100);
    return { id: videoId, videoUrl: finalVideoUrl, status: result.status || "completed" };
  } catch (error) {
    emitJobComplete(userId, {
      type: "video",
      videoId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      title: "Video Failed",
      message: "Video generation failed",
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: "FAILED" },
    });
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { id: videoId, status: "failed", error: errorMsg };
  }
}

/**
 * Process image enhancement jobs
 */
async function processImageEnhancement(job: Job<ImageEnhancementJob>): Promise<void> {
  const { generationId, imageUrl, scale, model, denoise, faceEnhance, userId } = job.data;

  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "PROCESSING" },
    });

    let result;
    if (model === "gfpgan" || model === "codeformer") {
      result = await enhanceFaces(imageUrl);
    } else {
      result = await upscaleImage({
        imageUrl,
        scale: scale as 1 | 2 | 4 | 8,
        model: model as "real-esrgan" | "gfpgan" | "codeformer" | "krya-enhance",
        denoise,
        faceEnhance,
      });
    }

    if (result.status === "failed") {
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: "FAILED" },
      });
      return;
    }

    let finalUrl = result.imageUrl;
    if (result.imageUrl) {
      try {
        const uploaded = await uploadFromUrl(result.imageUrl, userId);
        finalUrl = uploaded.url;
      } catch {
        finalUrl = result.imageUrl;
      }
    }

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "COMPLETED",
        imageUrl: finalUrl,
        width: result.enhancedSize?.width,
        height: result.enhancedSize?.height,
      },
    });

    emitJobComplete(userId, {
      type: "enhancement",
      generationId,
      imageUrl: finalUrl,
      status: "completed",
      title: "Enhancement Complete",
      message: "Your enhanced image is ready",
    });
  } catch (error) {
    emitJobComplete(userId, {
      type: "enhancement",
      generationId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      title: "Enhancement Failed",
      message: "Image enhancement failed",
    });

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

/**
 * Process model training jobs via Replicate API
 */
async function processModelTraining(job: Job<ModelTrainingJob>): Promise<void> {
  const { modelId, userId, name, baseModel, triggerWord, images, trainingSteps, learningRate, loraRank } = job.data;

  const replicateToken = process.env.REPLICATE_API_TOKEN;

  try {
    await prisma.trainedModel.update({
      where: { id: modelId },
      data: { status: "TRAINING" },
    });

    if (!replicateToken) {
      throw new Error("REPLICATE_API_TOKEN not configured for training");
    }

    // Start training via Replicate's training API
    const response = await fetch("https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/e440909d189b30e1f2a32db76f5c1eaa03eb3b1949f8c9479fb496da600b5e09/trainings", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          input_images: images[0], // URL to zip of training images
          trigger_word: triggerWord,
          steps: trainingSteps,
          learning_rate: learningRate,
          lora_rank: loraRank,
        },
        destination: `${process.env.REPLICATE_USERNAME || "user"}/${name.toLowerCase().replace(/\s+/g, "-")}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Training API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const trainingId = data.id;

    // Poll for training completion (training can take 10-60+ minutes)
    const maxAttempts = 360; // 30 minutes at 5s intervals
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`https://api.replicate.com/v1/trainings/${trainingId}`, {
        headers: { "Authorization": `Token ${replicateToken}` },
      });

      const statusData = await statusResponse.json();

      // Update progress
      await job.updateProgress(Math.min(Math.round((i / maxAttempts) * 100), 99));

      if (statusData.status === "succeeded") {
        await prisma.trainedModel.update({
          where: { id: modelId },
          data: {
            status: "COMPLETED",
            modelUrl: statusData.output?.weights || statusData.output?.version,
            completedAt: new Date(),
          },
        });

        emitJobComplete(userId, {
          type: "training",
          modelId,
          status: "completed",
          title: "Training Complete",
          message: `Your model "${name}" is ready to use`,
        });

        await addJob(QueueNames.NOTIFICATIONS, {
          userId,
          type: "training_complete",
          title: "Training Complete",
          message: `Your model "${name}" is ready to use`,
          data: { modelId },
        } satisfies NotificationJob);
        return;
      }

      if (statusData.status === "failed" || statusData.status === "canceled") {
        throw new Error(statusData.error || "Training failed");
      }
    }

    throw new Error("Training timed out");
  } catch (error) {
    await prisma.trainedModel.update({
      where: { id: modelId },
      data: { status: "FAILED" },
    });

    await addJob(QueueNames.NOTIFICATIONS, {
      userId,
      type: "training_complete",
      title: "Training Failed",
      message: `Training for "${name}" failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: { modelId },
    } satisfies NotificationJob);
    throw error;
  }
}

/**
 * Process background removal jobs
 */
async function processBackgroundRemoval(job: Job<BackgroundRemovalJob>): Promise<void> {
  const { generationId, imageUrl, userId } = job.data;

  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "PROCESSING" },
    });

    // Use fal.ai birefnet for background removal
    const falKey = process.env.FAL_KEY;
    if (!falKey) throw new Error("FAL_KEY not configured");

    const response = await fetch("https://fal.run/fal-ai/birefnet", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        model: "General Use (Heavy)",
        operating_resolution: "1024x1024",
      }),
    });

    if (!response.ok) throw new Error(`fal.ai error: ${response.statusText}`);
    const data = await response.json();
    const outputUrl = data.image?.url;
    if (!outputUrl) throw new Error("No output image from background removal");

    let finalUrl = outputUrl;
    try {
      const uploaded = await uploadFromUrl(outputUrl, userId);
      finalUrl = uploaded.url;
    } catch { /* use provider URL */ }

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
    });

    await addJob(QueueNames.NOTIFICATIONS, {
      userId,
      type: "generation_complete",
      title: "Background Removed",
      message: "Your background removal is ready",
      data: { generationId, imageUrl: finalUrl },
    } satisfies NotificationJob);
  } catch (error) {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

/**
 * Process logo generation jobs
 */
async function processLogoGeneration(job: Job<LogoGenerationJob>): Promise<void> {
  const { generationId, companyName, style, colors, userId } = job.data;

  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "PROCESSING" },
    });

    const colorStr = colors.length > 0 ? `, using colors: ${colors.join(", ")}` : "";
    const logoPrompt = `Professional ${style} logo design for "${companyName}"${colorStr}. Clean vector style, centered composition, white background, minimal, high quality logo`;

    const result = await generateImage(
      { prompt: logoPrompt, width: 1024, height: 1024, steps: 8 },
      "fal"
    );

    if (result.status === "failed" || !result.imageUrl) {
      throw new Error(result.error || "Logo generation failed");
    }

    let finalUrl = result.imageUrl;
    try {
      const uploaded = await uploadFromUrl(result.imageUrl, userId);
      finalUrl = uploaded.url;
    } catch { /* use provider URL */ }

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
    });

    await addJob(QueueNames.NOTIFICATIONS, {
      userId,
      type: "generation_complete",
      title: "Logo Ready",
      message: `Your logo for "${companyName}" is ready`,
      data: { generationId, imageUrl: finalUrl },
    } satisfies NotificationJob);
  } catch (error) {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

/**
 * Process style transfer jobs
 */
async function processStyleTransfer(job: Job<StyleTransferJob>): Promise<void> {
  const { generationId, contentImageUrl, stylePreset, styleImageUrl, strength, userId } = job.data;

  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "PROCESSING" },
    });

    const falKey = process.env.FAL_KEY;
    if (!falKey) throw new Error("FAL_KEY not configured");

    const stylePrompt = stylePreset
      ? `Apply ${stylePreset} art style, artistic transformation`
      : "Apply artistic style transfer";

    const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: contentImageUrl,
        prompt: stylePrompt,
        strength: strength,
        num_inference_steps: 20,
        guidance_scale: 7.5,
      }),
    });

    if (!response.ok) throw new Error(`fal.ai error: ${response.statusText}`);
    const data = await response.json();
    const outputUrl = data.images?.[0]?.url;
    if (!outputUrl) throw new Error("No output image from style transfer");

    let finalUrl = outputUrl;
    try {
      const uploaded = await uploadFromUrl(outputUrl, userId);
      finalUrl = uploaded.url;
    } catch { /* use provider URL */ }

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "COMPLETED", imageUrl: finalUrl, thumbnailUrl: finalUrl },
    });

    await addJob(QueueNames.NOTIFICATIONS, {
      userId,
      type: "generation_complete",
      title: "Style Transfer Complete",
      message: "Your styled image is ready",
      data: { generationId, imageUrl: finalUrl },
    } satisfies NotificationJob);
  } catch (error) {
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

/**
 * Process notification jobs
 */
async function processNotification(job: Job<NotificationJob>): Promise<void> {
  const { userId, type, title, message, data } = job.data;

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || {},
    },
  });

  // Push notification via WebSocket
  emitToUser(userId, "notification", {
    id: notification.id,
    type,
    title,
    message,
    data: data || {},
  });
}

/**
 * Initialize all workers. Call this once at server startup.
 */
export function initializeWorkers(): void {
  console.log("[Workers] Initializing BullMQ workers...");

  const imageWorker = createWorker<ImageGenerationJob>(
    QueueNames.IMAGE_GENERATION,
    processImageGeneration,
    { concurrency: 3 }
  );

  const videoWorker = createWorker<VideoGenerationJob, { id: string; videoUrl?: string; status: string; error?: string }>(
    QueueNames.VIDEO_GENERATION,
    processVideoGeneration,
    { concurrency: 2, lockDuration: 2400000 }
  );

  const enhanceWorker = createWorker<ImageEnhancementJob>(
    QueueNames.IMAGE_ENHANCEMENT,
    processImageEnhancement,
    { concurrency: 2 }
  );

  const trainingWorker = createWorker<ModelTrainingJob>(
    QueueNames.MODEL_TRAINING,
    processModelTraining,
    { concurrency: 1 }
  );

  const bgRemovalWorker = createWorker<BackgroundRemovalJob>(
    QueueNames.BACKGROUND_REMOVAL,
    processBackgroundRemoval,
    { concurrency: 2 }
  );

  const logoWorker = createWorker<LogoGenerationJob>(
    QueueNames.LOGO_GENERATION,
    processLogoGeneration,
    { concurrency: 2 }
  );

  const styleTransferWorker = createWorker<StyleTransferJob>(
    QueueNames.STYLE_TRANSFER,
    processStyleTransfer,
    { concurrency: 2 }
  );

  const notificationWorker = createWorker<NotificationJob>(
    QueueNames.NOTIFICATIONS,
    processNotification,
    { concurrency: 5 }
  );

  const workerNames = [
    imageWorker && "image-generation",
    videoWorker && "video-generation",
    enhanceWorker && "image-enhancement",
    trainingWorker && "model-training",
    bgRemovalWorker && "background-removal",
    logoWorker && "logo-generation",
    styleTransferWorker && "style-transfer",
    notificationWorker && "notifications",
  ].filter(Boolean);

  if (workerNames.length > 0) {
    console.log(`[Workers] Started: ${workerNames.join(", ")}`);
  } else {
    console.warn("[Workers] No workers started (Redis not available)");
  }
}
