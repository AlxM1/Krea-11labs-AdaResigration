"use client";

import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCanvasStore } from "@/stores/canvas-store";
import { cn } from "@/lib/utils";

export function LayerPanel() {
  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
  } = useCanvasStore();

  return (
    <div className="flex flex-col gap-3 p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Layers</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addLayer}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
              activeLayerId === layer.id ? "bg-primary/20" : "hover:bg-muted"
            )}
            onClick={() => setActiveLayer(layer.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {layer.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>

            <span className="flex-1 text-sm truncate">{layer.name}</span>

            {layer.locked ? (
              <Lock className="h-3 w-3 text-muted-foreground" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (layer.id !== "background") {
                    removeLayer(layer.id);
                  }
                }}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Layer opacity */}
      {activeLayerId && (
        <div className="pt-2 border-t border-border">
          <Slider
            label="Opacity"
            value={layers.find((l) => l.id === activeLayerId)?.opacity || 100}
            onChange={(value) => setLayerOpacity(activeLayerId, value)}
            min={0}
            max={100}
          />
        </div>
      )}
    </div>
  );
}
