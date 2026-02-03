import { create } from "zustand";

export type Tool = "brush" | "eraser" | "rectangle" | "circle" | "select" | "fill";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
}

export interface CanvasState {
  // Tool settings
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;

  brushSize: number;
  setBrushSize: (size: number) => void;

  brushColor: string;
  setBrushColor: (color: string) => void;

  brushOpacity: number;
  setBrushOpacity: (opacity: number) => void;

  // Canvas state
  canvasWidth: number;
  canvasHeight: number;
  setCanvasSize: (width: number, height: number) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;

  // AI Settings
  aiStrength: number;
  setAiStrength: (strength: number) => void;

  aiModel: string;
  setAiModel: (model: string) => void;

  prompt: string;
  setPrompt: (prompt: string) => void;

  seed: number;
  setSeed: (seed: number) => void;

  // Connection state
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  fps: number;
  setFps: (fps: number) => void;

  latency: number;
  setLatency: (latency: number) => void;

  // History
  undoStack: ImageData[];
  redoStack: ImageData[];
  pushUndo: (imageData: ImageData) => void;
  undo: () => ImageData | null;
  redo: () => ImageData | null;
  clearHistory: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Tool settings
  currentTool: "brush",
  setCurrentTool: (tool) => set({ currentTool: tool }),

  brushSize: 20,
  setBrushSize: (size) => set({ brushSize: size }),

  brushColor: "#ffffff",
  setBrushColor: (color) => set({ brushColor: color }),

  brushOpacity: 100,
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),

  // Canvas state
  canvasWidth: 512,
  canvasHeight: 512,
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  // Layers
  layers: [
    { id: "layer-1", name: "Layer 1", visible: true, opacity: 100, locked: false },
    { id: "background", name: "Background", visible: true, opacity: 100, locked: true },
  ],
  activeLayerId: "layer-1",

  addLayer: () => {
    const { layers } = get();
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length}`,
      visible: true,
      opacity: 100,
      locked: false,
    };
    set({ layers: [newLayer, ...layers], activeLayerId: newLayer.id });
  },

  removeLayer: (id) => {
    const { layers, activeLayerId } = get();
    if (layers.length <= 1 || id === "background") return;
    const newLayers = layers.filter((l) => l.id !== id);
    set({
      layers: newLayers,
      activeLayerId: activeLayerId === id ? newLayers[0]?.id : activeLayerId,
    });
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  toggleLayerVisibility: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    });
  },

  setLayerOpacity: (id, opacity) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, opacity } : l
      ),
    });
  },

  // AI Settings
  aiStrength: 75,
  setAiStrength: (strength) => set({ aiStrength: strength }),

  aiModel: "lcm-sdxl",
  setAiModel: (model) => set({ aiModel: model }),

  prompt: "",
  setPrompt: (prompt) => set({ prompt }),

  seed: -1,
  setSeed: (seed) => set({ seed }),

  // Connection state
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  fps: 0,
  setFps: (fps) => set({ fps }),

  latency: 0,
  setLatency: (latency) => set({ latency }),

  // History
  undoStack: [],
  redoStack: [],

  pushUndo: (imageData) => {
    const { undoStack } = get();
    const newStack = [...undoStack, imageData].slice(-50); // Keep last 50
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const imageData = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, imageData],
    });
    return imageData;
  },

  redo: () => {
    const { redoStack, undoStack } = get();
    if (redoStack.length === 0) return null;
    const imageData = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, imageData],
    });
    return imageData;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),
}));
