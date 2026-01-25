"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AutoSizeTextProps {
  children: ReactNode;
  className?: string;
  /** Maximum font size in pixels (default: 48) */
  maxSize?: number;
  /** Minimum font size in pixels (default: 16) */
  minSize?: number;
  /** Character threshold where scaling starts (default: 15) */
  scaleThreshold?: number;
}

/**
 * A component that automatically adjusts font size based on text length.
 * Uses a simple character-count heuristic for reliable sizing.
 */
export function AutoSizeText({
  children,
  className,
  maxSize = 48,
  minSize = 16,
  scaleThreshold = 15,
}: AutoSizeTextProps) {
  const fontSize = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    const length = text.length;

    if (length <= scaleThreshold) {
      return maxSize;
    }

    // Linear interpolation: scale down as text gets longer
    // At 2x threshold, we hit minSize
    const scaleFactor = Math.max(0, 1 - (length - scaleThreshold) / (scaleThreshold * 1.5));
    const size = minSize + (maxSize - minSize) * scaleFactor;

    return Math.max(minSize, Math.round(size));
  }, [children, maxSize, minSize, scaleThreshold]);

  return (
    <span
      className={cn("inline-block whitespace-nowrap", className)}
      style={{ fontSize: `${fontSize}px` }}
    >
      {children}
    </span>
  );
}
