"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className={cn("relative inline-flex cursor-pointer items-center", className)}>
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "h-6 w-11 rounded-full transition-all duration-200",
            "bg-muted peer-checked:bg-primary",
            "after:absolute after:left-[2px] after:top-[2px]",
            "after:h-5 after:w-5 after:rounded-full after:bg-white",
            "after:transition-all after:duration-200",
            "peer-checked:after:translate-x-5",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          )}
        />
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
