"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Upload,
  Download,
  Undo,
  Redo,
  Brush,
  Eraser,
  Square,
  Circle,
  Wand2,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const editModes = [
  { id: "inpaint", label: "Inpaint", icon: Brush, description: "Fill selected area" },
  { id: "outpaint", label: "Outpaint", icon: Square, description: "Extend image" },
  { id: "remove", label: "Remove", icon: Eraser, description: "Remove objects" },
  { id: "replace", label: "Replace BG", icon: Layers, description: "Change background" },
];

const editModels = [
  { value: "flux-kontext", label: "Flux Kontext" },
  { value: "sdxl-inpaint", label: "SDXL Inpaint" },
  { value: "sd-inpaint", label: "SD Inpaint" },
];

type Tool = "brush" | "eraser" | "rectangle" | "lasso" | "move";

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState("inpaint");
  const [selectedModel, setSelectedModel] = useState("flux-kontext");
  const [prompt, setPrompt] = useState("");
  const [brushSize, setBrushSize] = useState(30);
  const [currentTool, setCurrentTool] = useState<Tool>("brush");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleEdit = async () => {
    if (!image) {
      toast.error("Please upload an image first");
      return;
    }
    if (!prompt && editMode !== "remove") {
      toast.error("Please enter a prompt describing the edit");
      return;
    }

    setIsProcessing(true);

    // Simulate editing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    setIsProcessing(false);
    toast.success("Edit applied successfully!");
  };

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Tools */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Image Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit images with AI
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Edit Mode */}
          <div>
            <label className="text-sm font-medium mb-2 block">Edit Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {editModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setEditMode(mode.id)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    editMode === mode.id
                      ? "border-primary bg-primary/10"
                      : "border-[#2a2a2a] hover:border-[#333]"
                  )}
                >
                  <mode.icon className={cn(
                    "h-5 w-5 mb-1",
                    editMode === mode.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="text-sm font-medium">{mode.label}</div>
                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {editMode === "remove" ? "What to remove" : "Edit prompt"}
            </label>
            <Textarea
              placeholder={
                editMode === "inpaint"
                  ? "Describe what should appear in the selected area..."
                  : editMode === "outpaint"
                  ? "Describe the extended content..."
                  : editMode === "remove"
                  ? "Describe what to remove (optional)..."
                  : "Describe the new background..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={editModels}
            />
          </div>

          {/* Brush Tools */}
          <div>
            <label className="text-sm font-medium mb-2 block">Mask Tools</label>
            <div className="flex gap-1 mb-3">
              {[
                { id: "brush" as Tool, icon: Brush, label: "Brush" },
                { id: "eraser" as Tool, icon: Eraser, label: "Eraser" },
                { id: "rectangle" as Tool, icon: Square, label: "Rectangle" },
                { id: "move" as Tool, icon: Move, label: "Move" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setCurrentTool(tool.id)}
                  title={tool.label}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    currentTool === tool.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <tool.icon className="h-4 w-4" />
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={clearMask}
                title="Clear mask"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <Slider
              label="Brush Size"
              value={brushSize}
              onChange={setBrushSize}
              min={5}
              max={100}
            />
          </div>

          {/* Tips */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="text-muted-foreground text-xs space-y-1">
              <li>- Paint over the area you want to edit</li>
              <li>- Be specific in your prompt</li>
              <li>- Use remove mode for object deletion</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleEdit}
            disabled={!image}
            isLoading={isProcessing}
          >
            <Wand2 className="h-5 w-5" />
            Apply Edit
          </Button>
        </div>
      </div>

      {/* Right Panel - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Redo className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="ghost" size="icon">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              id="editor-upload"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("editor-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-6 overflow-auto bg-[#0a0a0a]">
          <div className="h-full flex items-center justify-center">
            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Edit"
                  className="max-h-[70vh] rounded-lg"
                />
                {/* Mask overlay canvas would go here */}
                <canvas
                  ref={maskCanvasRef}
                  className="absolute inset-0 pointer-events-auto cursor-crosshair"
                  style={{ mixBlendMode: "multiply" }}
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-3" />
                      <p className="text-white">Applying edit...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-12 text-center cursor-pointer hover:border-[#333] transition-colors"
                onClick={() => document.getElementById("editor-upload")?.click()}
              >
                <Scissors className="h-12 w-12 text-[#333] mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold mb-2">Upload an image to edit</h3>
                <p className="text-[#555] text-sm">
                  Supports JPG, PNG, WebP
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
