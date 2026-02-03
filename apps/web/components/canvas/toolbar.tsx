"use client";

import {
  Brush,
  Eraser,
  Square,
  Circle,
  MousePointer,
  PaintBucket,
  Undo,
  Redo,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCanvasStore, type Tool } from "@/stores/canvas-store";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onClear?: () => void;
  onDownload?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const tools: { id: Tool; icon: typeof Brush; label: string }[] = [
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "fill", icon: PaintBucket, label: "Fill" },
];

const colors = [
  "#ffffff",
  "#ff0000",
  "#ff8800",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#0088ff",
  "#8800ff",
  "#ff00ff",
  "#000000",
];

export function Toolbar({ onClear, onDownload, onUndo, onRedo }: ToolbarProps) {
  const {
    currentTool,
    setCurrentTool,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    undoStack,
    redoStack,
  } = useCanvasStore();

  return (
    <div className="flex flex-col gap-4 p-3 bg-card rounded-lg border border-border">
      {/* Tools */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tools</p>
        <div className="grid grid-cols-3 gap-1">
          {tools.map((tool) => (
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
              <tool.icon className="h-4 w-4 mx-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Size</p>
        <Slider
          value={brushSize}
          onChange={setBrushSize}
          min={1}
          max={100}
          showValue={false}
        />
        <div className="flex items-center justify-center">
          <div
            className="rounded-full bg-white"
            style={{
              width: Math.min(brushSize, 40),
              height: Math.min(brushSize, 40),
            }}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Color</p>
        <div className="grid grid-cols-5 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              className={cn(
                "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110",
                brushColor === color
                  ? "border-primary scale-110"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">{brushColor}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Actions</p>
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={undoStack.length === 0}
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={redoStack.length === 0}
          >
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
