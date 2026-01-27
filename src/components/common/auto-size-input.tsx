"use client";

import { useRef, useEffect, useCallback, forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AutoSizeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Maximum font size in pixels (default: 48) */
  maxSize?: number;
  /** Minimum font size in pixels (default: 16) */
  minSize?: number;
  /** Step size for font adjustment (default: 1) */
  step?: number;
}

/**
 * An input component that automatically adjusts font size to fit text on a single line.
 * Uses a hidden measurement span for accurate width calculation.
 */
export const AutoSizeInput = forwardRef<HTMLInputElement, AutoSizeInputProps>(
  ({ className, maxSize = 48, minSize = 16, step = 1, value, onChange, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const resize = useCallback(() => {
      const container = containerRef.current;
      const measure = measureRef.current;
      const input = inputRef.current;
      if (!container || !measure || !input) return;

      // Update measurement span with current value
      measure.textContent = (input.value || input.placeholder || "") + "\u00A0"; // Add nbsp for cursor space

      // Reset to max size
      let currentSize = maxSize;
      container.style.setProperty("--auto-size-font", `${currentSize}px`);

      // Shrink until it fits or hits minimum
      while (measure.scrollWidth > container.clientWidth && currentSize > minSize) {
        currentSize -= step;
        container.style.setProperty("--auto-size-font", `${currentSize}px`);
      }
    }, [maxSize, minSize, step]);

    useEffect(() => {
      resize();

      const observer = new ResizeObserver(resize);
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }, [resize, value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e);
        // Delay resize to next frame to ensure value is updated
        requestAnimationFrame(resize);
      },
      [onChange, resize]
    );

    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ ["--auto-size-font" as string]: `${maxSize}px` }}
      >
        {/* Hidden measurement span */}
        <span
          ref={measureRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-[length:var(--auto-size-font)]",
            className
          )}
        />
        {/* Actual input */}
        <input
          ref={setRefs}
          value={value}
          onChange={handleChange}
          className={cn(
            "w-full bg-transparent outline-none text-[length:var(--auto-size-font)]",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

AutoSizeInput.displayName = "AutoSizeInput";
