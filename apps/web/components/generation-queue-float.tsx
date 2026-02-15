"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video,
  Wand2,
  Palette,
  Scissors,
  X,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Job {
  id: string | number;
  type: string;
  prompt: string;
  progress?: number;
  timestamp: number;
}

interface QueueStatus {
  queues: Record<string, { active: number; waiting: number; completed: number; failed: number }>;
  userJobs: {
    active: Job[];
    waiting: Job[];
  };
}

const typeConfig: Record<string, { icon: typeof ImageIcon; label: string; color: string }> = {
  image: { icon: ImageIcon, label: "Image", color: "text-[#888]" },
  video: { icon: Video, label: "Video", color: "text-[#888]" },
  enhancement: { icon: Wand2, label: "Enhance", color: "text-[#888]" },
  logo: { icon: Palette, label: "Logo", color: "text-[#888]" },
  "style-transfer": { icon: Palette, label: "Style", color: "text-[#888]" },
  "bg-removal": { icon: Scissors, label: "BG Remove", color: "text-[#888]" },
};

function formatElapsed(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs}s`;
}

export function GenerationQueueFloat() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/status");
      if (!res.ok) return;
      const data: QueueStatus = await res.json();
      setStatus(data);

      // Auto-expand when new jobs appear
      const totalActive = data.userJobs.active.length + data.userJobs.waiting.length;
      if (totalActive > 0 && dismissed) {
        setDismissed(false);
      }
    } catch {
      // Silently fail - panel is non-critical
    }
  }, [dismissed]);

  // Poll every 3 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Tick every second to update elapsed timers
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const totalActive = Object.values(status.queues).reduce((sum, q) => sum + q.active, 0);
  const totalWaiting = Object.values(status.queues).reduce((sum, q) => sum + q.waiting, 0);
  const activeJobs = status.userJobs.active;
  const waitingJobs = status.userJobs.waiting;
  const hasJobs = activeJobs.length > 0 || waitingJobs.length > 0;

  // Don't render if dismissed and no active jobs
  if (dismissed && !hasJobs) return null;
  // Don't render at all if nothing happening
  if (totalActive === 0 && totalWaiting === 0 && !hasJobs) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed pill */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border transition-all",
            "bg-[#141414]/95 backdrop-blur-sm border-border/60 hover:border-primary/50",
            hasJobs && "animate-pulse-subtle"
          )}
        >
          {hasJobs ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Activity className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {totalActive > 0 ? `${totalActive} active` : "Queue idle"}
          </span>
          {totalWaiting > 0 && (
            <span className="text-xs text-muted-foreground">+{totalWaiting} queued</span>
          )}
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        </button>
      ) : (
        /* Expanded panel */
        <div className="w-80 rounded-xl shadow-2xl border border-border/60 bg-[#141414]/95 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              {hasJobs ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Activity className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">Generation Queue</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(false)}
                className="h-6 w-6 rounded hover:bg-white/5 flex items-center justify-center"
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => {
                  setExpanded(false);
                  setDismissed(true);
                }}
                className="h-6 w-6 rounded hover:bg-white/5 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border/30">
            <span>
              <span className="text-primary font-medium">{totalActive}</span> active
            </span>
            <span>
              <span className="font-medium">{totalWaiting}</span> queued
            </span>
          </div>

          {/* Job list */}
          <div className="max-h-64 overflow-y-auto">
            {activeJobs.length === 0 && waitingJobs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No active jobs</p>
              </div>
            ) : (
              <>
                {activeJobs.map((job) => {
                  const config = typeConfig[job.type] || typeConfig.image;
                  const Icon = config.icon;
                  return (
                    <div
                      key={`active-${job.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 last:border-0"
                    >
                      <div className={cn("shrink-0", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">{config.label}</span>
                          <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.prompt}</p>
                        {job.progress !== undefined && job.progress > 0 && (
                          <div className="mt-1 h-1 w-full rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {formatElapsed(job.timestamp)}
                      </div>
                    </div>
                  );
                })}

                {waitingJobs.map((job) => {
                  const config = typeConfig[job.type] || typeConfig.image;
                  const Icon = config.icon;
                  return (
                    <div
                      key={`waiting-${job.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 last:border-0 opacity-60"
                    >
                      <div className="shrink-0 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground">{config.label} - queued</span>
                        <p className="text-xs text-muted-foreground/70 truncate">{job.prompt}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
