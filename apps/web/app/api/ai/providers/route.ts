/**
 * AI Providers API
 * GET: Check health of all providers
 */

import { NextResponse } from "next/server";
import { checkAllProvidersHealth, ProviderHealth } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const providers = await checkAllProvidersHealth();

    // Categorize by mode
    const cloud = providers.filter((p) => p.mode === "cloud");
    const local = providers.filter((p) => p.mode === "local");

    // Determine recommended mode
    const hasCloudProvider = cloud.some((p) => p.available);
    const hasLocalProvider = local.some((p) => p.available);

    let recommendedMode: "cloud" | "local" | "none" = "none";
    if (hasLocalProvider) recommendedMode = "local";
    if (hasCloudProvider) recommendedMode = "cloud";

    return NextResponse.json({
      providers,
      cloud: {
        available: hasCloudProvider,
        providers: cloud,
      },
      local: {
        available: hasLocalProvider,
        providers: local,
      },
      recommendedMode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check providers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
