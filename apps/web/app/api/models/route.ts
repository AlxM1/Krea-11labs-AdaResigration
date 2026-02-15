import { NextRequest, NextResponse } from "next/server";
import { refreshRegistry, getRegistrySnapshot } from "@/lib/ai/model-registry";

// Get auto-discovered models from ComfyUI
export async function GET(req: NextRequest) {
  try {
    // Force refresh on first call, then use cached data
    await refreshRegistry();
    const snapshot = getRegistrySnapshot();

    const { searchParams } = new URL(req.url);
    const task = searchParams.get("task"); // e.g. "text-to-image", "text-to-video"

    let models = snapshot.models;
    if (task) {
      models = models.filter((m) => m.tasks.includes(task as never));
    }

    return NextResponse.json({
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        filename: m.filename,
        provider: m.provider,
        tasks: m.tasks,
        description: m.description,
        isAvailable: m.isAvailable,
        priority: m.priority,
        config: m.config,
      })),
      total: models.length,
      comfyuiOnline: snapshot.comfyuiOnline,
      lastRefresh: snapshot.lastRefresh,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get available base models for training
export async function OPTIONS(req: NextRequest) {
  const baseModels = [
    {
      id: "flux-dev",
      name: "Flux Dev",
      description: "High quality general purpose model",
      supportedTypes: ["LORA"],
    },
    {
      id: "sdxl",
      name: "Stable Diffusion XL",
      description: "Versatile model with good quality",
      supportedTypes: ["LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"],
    },
    {
      id: "sd15",
      name: "Stable Diffusion 1.5",
      description: "Classic model with wide compatibility",
      supportedTypes: ["LORA", "DREAMBOOTH", "TEXTUAL_INVERSION"],
    },
  ];

  return NextResponse.json({ baseModels });
}
