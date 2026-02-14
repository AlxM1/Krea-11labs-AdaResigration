"use client";

import { Move, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MotionTransferPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <Move className="h-10 w-10 text-muted-foreground" />
        </div>
        <Badge variant="outline" className="mb-4">Coming Soon</Badge>
        <h1 className="text-2xl font-bold mb-3">Motion Transfer</h1>
        <p className="text-muted-foreground mb-6">
          Transfer motion from a video to any image using AI.
          This feature requires optical flow or motion transfer custom nodes for ComfyUI.
        </p>
        <div className="p-4 rounded-lg bg-muted/50 text-left text-sm">
          <p className="font-medium mb-2">To enable this feature:</p>
          <ol className="text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Install a motion transfer node (e.g., AnimateDiff, DragAnything)</li>
            <li>Download the required model checkpoints</li>
            <li>Restart ComfyUI and this app will auto-detect the nodes</li>
          </ol>
          <a
            href="https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
          >
            AnimateDiff for ComfyUI <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
