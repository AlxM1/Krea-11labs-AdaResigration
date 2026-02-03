import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderMode = "cloud" | "local";
export type AIProvider = "fal" | "replicate" | "together" | "google" | "comfyui" | "ollama";

interface AISettingsState {
  // Provider mode (cloud or local)
  mode: ProviderMode;
  setMode: (mode: ProviderMode) => void;

  // Active provider for image/video generation
  imageProvider: AIProvider;
  setImageProvider: (provider: AIProvider) => void;

  // Active provider for LLM tasks (prompt enhancement)
  llmProvider: "ollama" | "openai" | null;
  setLlmProvider: (provider: "ollama" | "openai" | null) => void;

  // Feature toggles
  autoEnhancePrompts: boolean;
  setAutoEnhancePrompts: (value: boolean) => void;

  autoGenerateNegative: boolean;
  setAutoGenerateNegative: (value: boolean) => void;

  // Local provider URLs (for custom configurations)
  comfyuiUrl: string;
  setComfyuiUrl: (url: string) => void;

  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;

  // Local model preferences
  comfyuiModel: string;
  setComfyuiModel: (model: string) => void;

  ollamaModel: string;
  setOllamaModel: (model: string) => void;

  // Reset to defaults
  resetSettings: () => void;
}

const defaultSettings = {
  mode: "cloud" as ProviderMode,
  imageProvider: "fal" as AIProvider,
  llmProvider: null as "ollama" | "openai" | null,
  autoEnhancePrompts: false,
  autoGenerateNegative: false,
  comfyuiUrl: "http://127.0.0.1:8188",
  ollamaUrl: "http://127.0.0.1:11434",
  comfyuiModel: "sd_xl_base_1.0.safetensors",
  ollamaModel: "llama3.2",
};

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setMode: (mode) => {
        set({ mode });
        // Auto-switch image provider based on mode
        if (mode === "local") {
          set({ imageProvider: "comfyui", llmProvider: "ollama" });
        } else {
          set({ imageProvider: "fal", llmProvider: null });
        }
      },

      setImageProvider: (provider) => set({ imageProvider: provider }),
      setLlmProvider: (provider) => set({ llmProvider: provider }),

      setAutoEnhancePrompts: (value) => set({ autoEnhancePrompts: value }),
      setAutoGenerateNegative: (value) => set({ autoGenerateNegative: value }),

      setComfyuiUrl: (url) => set({ comfyuiUrl: url }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),

      setComfyuiModel: (model) => set({ comfyuiModel: model }),
      setOllamaModel: (model) => set({ ollamaModel: model }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "krya-ai-settings",
      version: 1,
    }
  )
);

/**
 * Hook to get the current provider for API calls
 */
export function useCurrentProvider(): AIProvider {
  return useAISettingsStore((state) => state.imageProvider);
}

/**
 * Hook to check if we're in local mode
 */
export function useIsLocalMode(): boolean {
  return useAISettingsStore((state) => state.mode === "local");
}
