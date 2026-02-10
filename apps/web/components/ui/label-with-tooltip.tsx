"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  optional?: boolean;
  className?: string;
}

export function LabelWithTooltip({ label, tooltip, optional, className }: LabelWithTooltipProps) {
  return (
    <div className={`flex items-center gap-1.5 mb-2 ${className || ""}`}>
      <label className="text-sm font-medium">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        )}
      </label>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
