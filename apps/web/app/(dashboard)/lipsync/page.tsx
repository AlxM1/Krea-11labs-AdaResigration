"use client";

import { Mic, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LipsyncPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <Mic className="h-10 w-10 text-muted-foreground" />
        </div>
        <Badge variant="outline" className="mb-4">Coming Soon</Badge>
        <h1 className="text-2xl font-bold mb-3">Video Lipsync</h1>
        <p className="text-muted-foreground mb-6">
          Sync any video to audio with AI-powered lip synchronization.
          This feature requires SadTalker or Wav2Lip custom nodes for ComfyUI.
        </p>
        <div className="p-4 rounded-lg bg-muted/50 text-left text-sm">
          <p className="font-medium mb-2">To enable this feature:</p>
          <ol className="text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Install SadTalker custom node in ComfyUI</li>
            <li>Download the required model checkpoints</li>
            <li>Restart ComfyUI and this app will auto-detect the nodes</li>
          </ol>
          <a
            href="https://github.com/Gourieff/comfyui-reactor-node"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
          >
            ComfyUI Custom Nodes Guide <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
