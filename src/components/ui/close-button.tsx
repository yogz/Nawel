"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "danger";
}

const sizeClasses = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizes = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
};

const variantClasses = {
  default: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
};

const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, size = "md", variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          // Expand touch target to WCAG 2.5.5 minimum (44×44px) via ::before while keeping visual size
          "relative flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <X size={iconSizes[size]} />
        <span className="sr-only">Close</span>
      </button>
    );
  }
);
CloseButton.displayName = "CloseButton";

export { CloseButton };
