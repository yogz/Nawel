"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Solutions de contournement pour les problèmes de focus dans les drawers
 */

/**
 * Solution 1: Input avec gestion manuelle du scroll
 * Utilise un ref pour scroller vers l'input quand il reçoit le focus
 */
export const DrawerInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    scrollOnFocus?: boolean;
  }
>(({ className, scrollOnFocus = true, onFocus, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const combinedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    },
    [ref]
  );

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (scrollOnFocus && inputRef.current) {
        // Délai pour laisser le clavier apparaître
        setTimeout(() => {
          inputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 100);
      }
      onFocus?.(e);
    },
    [scrollOnFocus, onFocus]
  );

  return (
    <input
      ref={combinedRef}
      className={cn(
        "flex h-9 w-full scroll-m-20 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onFocus={handleFocus}
      {...props}
    />
  );
});
DrawerInput.displayName = "DrawerInput";

/**
 * Solution 2: Textarea comme input simple (souvent mieux géré)
 * Les textareas sont généralement mieux gérés par les navigateurs mobiles
 */
export const DrawerTextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & {
    rows?: number;
    scrollOnFocus?: boolean;
  }
>(({ className, rows = 1, scrollOnFocus = true, onFocus, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const combinedRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      textareaRef.current = node;
    },
    [ref]
  );

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (scrollOnFocus && textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 100);
      }
      onFocus?.(e);
    },
    [scrollOnFocus, onFocus]
  );

  // Auto-resize pour simuler un input
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener("input", adjustHeight);
    adjustHeight();

    return () => textarea.removeEventListener("input", adjustHeight);
  }, []);

  return (
    <textarea
      ref={combinedRef}
      rows={rows}
      className={cn(
        "flex min-h-[36px] w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onFocus={handleFocus}
      {...props}
    />
  );
});
DrawerTextareaInput.displayName = "DrawerTextareaInput";

/**
 * Solution 3: Input natif avec gestion du viewport
 * Utilise les APIs natives pour mieux gérer le clavier virtuel
 */
export const DrawerNativeInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    preventAutoFocus?: boolean;
  }
>(({ className, preventAutoFocus = false, autoFocus, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!preventAutoFocus && autoFocus && inputRef.current) {
      // Délai pour éviter les problèmes de focus initial
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, preventAutoFocus]);

  const combinedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    },
    [ref]
  );

  return (
    <input
      ref={combinedRef}
      className={cn(
        "flex h-9 w-full scroll-m-20 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
      autoFocus={preventAutoFocus ? false : autoFocus}
    />
  );
});
DrawerNativeInput.displayName = "DrawerNativeInput";
