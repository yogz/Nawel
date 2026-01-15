"use client";

import { useRef, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AutoSizeTextProps {
  children: ReactNode;
  className?: string;
  /** Maximum font size in pixels (default: 48) */
  maxSize?: number;
  /** Minimum font size in pixels (default: 16) */
  minSize?: number;
  /** Step size for font adjustment (default: 1) */
  step?: number;
}

/**
 * A component that automatically adjusts font size to fit text on a single line.
 * Uses ResizeObserver for responsive sizing.
 */
export function AutoSizeText({
  children,
  className,
  maxSize = 48,
  minSize = 16,
  step = 1,
}: AutoSizeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const resize = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Reset to max size
    text.style.fontSize = `${maxSize}px`;

    // Shrink until it fits or hits minimum
    let currentSize = maxSize;
    while (text.scrollWidth > container.clientWidth && currentSize > minSize) {
      currentSize -= step;
      text.style.fontSize = `${currentSize}px`;
    }
  }, [maxSize, minSize, step]);

  useEffect(() => {
    resize();

    const observer = new ResizeObserver(resize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [resize, children]);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden", className)}>
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap"
        style={{ fontSize: `${maxSize}px` }}
      >
        {children}
      </span>
    </div>
  );
}
