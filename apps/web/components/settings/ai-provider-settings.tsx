"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProviderStatus {
  provider: string;
  available: boolean;
  mode: "cloud" | "local";
  models?: string[];
  error?: string;
}

interface ProvidersResponse {
  providers: ProviderStatus[];
  cloud: { available: boolean; providers: ProviderStatus[] };
  local: { available: boolean; providers: ProviderStatus[] };
  recommendedMode: "cloud" | "local" | "none";
}

export interface AIProviderSettingsProps {
  onModeChange?: (mode: "cloud" | "local") => void;
  onProviderChange?: (provider: string) => void;
  className?: string;
}

const PROVIDER_INFO: Record<string, { name: string; description: string; icon: string }> = {
  fal: {
    name: "fal.ai",
    description: "Fast cloud inference with Flux, SDXL",
    icon: "☁️",
  },
  replicate: {
    name: "Replicate",
    description: "Run open-source models in the cloud",
    icon: "🔄",
  },
  together: {
    name: "Together AI",
    description: "Distributed AI inference platform",
    icon: "🤝",
  },
  google: {
    name: "Google AI",
    description: "Imagen 4 (images) + Veo 3.1 (4K video with audio)",
    icon: "🎨",
  },
  comfyui: {
    name: "ComfyUI",
    description: "Local image/video generation with your GPU",
    icon: "🖥️",
  },
  ollama: {
    name: "Ollama",
    description: "Local LLM for prompt enhancement",
    icon: "🦙",
  },
};

export function AIProviderSettings({
  onModeChange,
  onProviderChange,
  className,
}: AIProviderSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [mode, setMode] = useState<"cloud" | "local">("cloud");
  const [selectedProvider, setSelectedProvider] = useState<string>("fal");

  // Load provider status
  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/providers");
      if (!res.ok) throw new Error("Failed to load providers");
      const data: ProvidersResponse = await res.json();
      setProviders(data);

      // Auto-select mode based on availability
      if (data.local.available && !data.cloud.available) {
        setMode("local");
        onModeChange?.("local");
      } else if (data.cloud.available) {
        setMode("cloud");
        onModeChange?.("cloud");
      }

      // Auto-select first available provider
      const availableProviders = data.providers.filter((p) => p.available);
      if (availableProviders.length > 0) {
        const defaultProvider =
          availableProviders.find((p) => p.mode === mode) || availableProviders[0];
        setSelectedProvider(defaultProvider.provider);
        onProviderChange?.(defaultProvider.provider);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleModeChange = (useLocal: boolean) => {
    const newMode = useLocal ? "local" : "cloud";
    setMode(newMode);
    onModeChange?.(newMode);

    // Auto-select provider for the new mode
    if (providers) {
      const modeProviders = providers.providers.filter(
        (p) => p.mode === newMode && p.available
      );
      if (modeProviders.length > 0) {
        setSelectedProvider(modeProviders[0].provider);
        onProviderChange?.(modeProviders[0].provider);
      }
    }
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    onProviderChange?.(provider);
  };

  const modeProviders = providers?.providers.filter((p) => p.mode === mode) || [];
  const localAvailable = providers?.local.available ?? false;
  const cloudAvailable = providers?.cloud.available ?? false;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Provider Settings
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </CardTitle>
            <CardDescription>
              Choose between cloud APIs or local GPU inference
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadProviders} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{mode === "local" ? "🖥️" : "☁️"}</span>
              <span className="font-medium">
                {mode === "local" ? "Local GPU" : "Cloud APIs"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === "local"
                ? "Use your RTX GPU for inference (no API costs)"
                : "Use cloud providers for fast, reliable inference"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn("text-sm", mode === "cloud" && "font-medium")}>Cloud</span>
            <Switch
              checked={mode === "local"}
              onCheckedChange={handleModeChange}
              disabled={!localAvailable && mode === "cloud"}
            />
            <span className={cn("text-sm", mode === "local" && "font-medium")}>Local</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          <Badge variant={cloudAvailable ? "default" : "outline"}>
            {cloudAvailable ? "✓" : "✗"} Cloud {cloudAvailable ? "Ready" : "Unavailable"}
          </Badge>
          <Badge variant={localAvailable ? "default" : "outline"}>
            {localAvailable ? "✓" : "✗"} Local {localAvailable ? "Ready" : "Unavailable"}
          </Badge>
        </div>

        {/* Provider List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {mode === "local" ? "Local Providers" : "Cloud Providers"}
          </h4>

          {modeProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "local"
                  ? "No local providers detected. Make sure ComfyUI or Ollama is running."
                  : "No cloud providers configured. Add API keys in .env"}
              </p>
              {mode === "local" && (
                <div className="mt-4 space-y-2 text-left text-xs text-muted-foreground">
                  <p className="font-medium">Quick Setup:</p>
                  <p>• ComfyUI: Run on port 8188</p>
                  <p>• Ollama: Run `ollama serve`</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {modeProviders.map((provider) => {
                const info = PROVIDER_INFO[provider.provider];
                const isSelected = selectedProvider === provider.provider;

                return (
                  <button
                    key={provider.provider}
                    onClick={() => provider.available && handleProviderSelect(provider.provider)}
                    disabled={!provider.available}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4 text-left transition-all",
                      "hover:bg-accent/50",
                      isSelected && "border-primary bg-primary/5",
                      !provider.available && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <span className="text-2xl">{info?.icon || "🔌"}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{info?.name || provider.provider}</span>
                        {provider.available ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Offline
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {info?.description || "AI provider"}
                      </p>
                      {provider.models && provider.models.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {provider.models.slice(0, 5).map((model) => (
                            <Badge key={model} variant="secondary" className="text-xs">
                              {model.length > 25 ? model.slice(0, 25) + "..." : model}
                            </Badge>
                          ))}
                          {provider.models.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{provider.models.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                      {provider.error && (
                        <p className="mt-1 text-xs text-destructive">{provider.error}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Local Setup Instructions */}
        {mode === "local" && !localAvailable && (
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h4 className="font-medium">Local Setup Guide</h4>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-primary">ComfyUI (Image/Video)</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Download ComfyUI from GitHub</li>
                  <li>Install SDXL/Flux models in `models/checkpoints/`</li>
                  <li>Run: `python main.py --listen`</li>
                  <li>Access at http://127.0.0.1:8188</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-primary">Ollama (Prompt Enhancement)</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Install from ollama.ai</li>
                  <li>Run: `ollama pull llama3.2`</li>
                  <li>Start: `ollama serve`</li>
                  <li>Access at http://127.0.0.1:11434</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIProviderSettings;
