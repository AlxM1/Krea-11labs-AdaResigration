"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border text-foreground bg-transparent",
    success: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30",
    warning: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/30",
    destructive: "bg-destructive/20 text-destructive border border-destructive/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
