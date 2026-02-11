import { create } from "zustand";

export interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  batchSize: number;
}

export interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  images?: string[]; // All images from batch generation
  thumbnailUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  params: Partial<GenerationParams>;
  isPublic?: boolean;
}

interface GenerationState {
  // Generation params
  params: GenerationParams;
  setParams: (params: Partial<GenerationParams>) => void;
  resetParams: () => void;

  // Current generation
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  currentGeneration: Generation | null;
  setCurrentGeneration: (gen: Generation | null) => void;

  // History
  generations: Generation[];
  addGeneration: (gen: Generation) => void;
  removeGeneration: (id: string) => void;
  clearGenerations: () => void;

  // Selected for comparison/download
  selectedGenerations: string[];
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
}

const defaultParams: GenerationParams = {
  prompt: "",
  negativePrompt: "",
  model: "comfyui-sdxl", // SDXL (Local GPU) - free, no API costs
  width: 1024,
  height: 1024,
  steps: 20, // SDXL default steps
  cfgScale: 7.5,
  seed: -1,
  batchSize: 1,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  // Params
  params: defaultParams,
  setParams: (params) =>
    set((state) => ({ params: { ...state.params, ...params } })),
  resetParams: () => set({ params: defaultParams }),

  // Current generation
  isGenerating: false,
  setIsGenerating: (value) => set({ isGenerating: value }),
  currentGeneration: null,
  setCurrentGeneration: (gen) => set({ currentGeneration: gen }),

  // History
  generations: [],
  addGeneration: (gen) =>
    set((state) => ({ generations: [gen, ...state.generations] })),
  removeGeneration: (id) =>
    set((state) => ({
      generations: state.generations.filter((g) => g.id !== id),
    })),
  clearGenerations: () => set({ generations: [] }),

  // Selection
  selectedGenerations: [],
  toggleSelection: (id) =>
    set((state) => ({
      selectedGenerations: state.selectedGenerations.includes(id)
        ? state.selectedGenerations.filter((i) => i !== id)
        : [...state.selectedGenerations, id],
    })),
  clearSelection: () => set({ selectedGenerations: [] }),
}));
