import { NextResponse } from "next/server";
import {
  refreshRegistry,
  getRegistrySnapshot,
  type TaskType,
  type ModelInfo,
} from "@/lib/ai/model-registry";

const TASK_TYPES: TaskType[] = [
  "text-to-image",
  "image-to-image",
  "text-to-video",
  "image-to-video",
  "upscale",
  "enhance",
  "logo",
];

export async function GET() {
  try {
    const snapshot = getRegistrySnapshot();

    // Auto-refresh if stale
    if (snapshot.models.length === 0 || Date.now() - snapshot.lastRefresh > 5 * 60 * 1000) {
      await refreshRegistry();
    }

    const { models, comfyuiOnline } = getRegistrySnapshot();

    // Group models by task type
    const grouped: Record<string, ModelInfo[]> = {};
    for (const task of TASK_TYPES) {
      grouped[task] = models
        .filter((m) => m.tasks.includes(task) && m.isAvailable)
        .sort((a, b) => a.priority - b.priority);
    }

    return NextResponse.json({ models: grouped, comfyuiOnline });
  } catch (error) {
    console.error("[/api/ai/models] Error:", error);
    return NextResponse.json(
      { models: {}, comfyuiOnline: false, error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
