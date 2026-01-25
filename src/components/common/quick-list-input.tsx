"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ListPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface QuickListItem {
  id?: number;
  name: string;
  isNew?: boolean;
}

interface QuickListInputProps {
  items: QuickListItem[];
  onAdd: (name: string) => void;
  onRemove?: (item: QuickListItem, index: number) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  maxItems?: number;
  hideCount?: boolean;
}

/**
 * A premium, mobile-first list entry component.
 * Features a sticky bottom input and smooth shift-up animations.
 */
export function QuickListInput({
  items,
  onAdd,
  onRemove,
  placeholder = "Ajouter quelque chose...",
  title,
  className,
  maxItems,
  hideCount,
}: QuickListInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onAdd(trimmedValue);
      setInputValue("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // Handle iOS virtual keyboard positioning
  // On iOS, when the keyboard opens, the visualViewport shrinks but the layout viewport doesn't
  // This causes a gap between the keyboard and absolutely positioned elements
  const handleViewportResize = useCallback(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    // Calculate the offset: difference between window height and visual viewport height
    // Plus any scroll offset of the visual viewport
    const offset = window.innerHeight - viewport.height - viewport.offsetTop;
    setKeyboardOffset(Math.max(0, offset));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    viewport.addEventListener("resize", handleViewportResize);
    viewport.addEventListener("scroll", handleViewportResize);

    // Initial check
    handleViewportResize();

    return () => {
      viewport.removeEventListener("resize", handleViewportResize);
      viewport.removeEventListener("scroll", handleViewportResize);
    };
  }, [handleViewportResize]);

  // Auto-scroll to keep new items visible (they appear at the bottom with flex-col-reverse)
  useEffect(() => {
    if (scrollRef.current) {
      // With flex-col-reverse, scrollTop 0 is the visual bottom where new items appear
      scrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [items]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-white/50 backdrop-blur-sm",
        className
      )}
    >
      {/* Header (Optional) */}
      {title && (
        <div className="border-b bg-white/80 px-6 py-4 backdrop-blur-md">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {!hideCount && (
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              {items.length} {items.length > 1 ? "éléments" : "élément"}
            </p>
          )}
        </div>
      )}

      {/* List Area */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-6 scrollbar-none"
        style={{ paddingBottom: "120px" }} // Space for the floating input
      >
        <div className="mt-auto flex flex-col-reverse gap-3">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={item.id ? `existing-${item.id}` : `new-${item.name}-${index}`}
                layout
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 1,
                  },
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur-sm transition-all",
                  item.isNew
                    ? "border-accent/20 bg-accent/5"
                    : "border-gray-100 bg-white/70 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    item.isNew
                      ? "bg-accent/20 text-accent"
                      : "bg-gradient-to-br from-accent/20 to-pink-500/10 text-accent"
                  )}
                >
                  <ListPlus size={18} />
                </div>
                <span className="flex-1 text-base font-semibold text-gray-800">{item.name}</span>
                {onRemove && (
                  <button
                    onClick={() => onRemove(item, index)}
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <ListPlus size={40} />
              </div>
              <p className="text-lg font-bold text-gray-900">Liste vide</p>
              <p className="text-sm text-gray-500">{placeholder}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Premium Input Container */}
      <div
        className="absolute left-0 right-0 z-20 p-4 transition-[bottom] duration-100"
        style={{
          bottom: keyboardOffset,
          paddingBottom:
            keyboardOffset > 0
              ? "1rem"
              : `max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))`,
        }}
      >
        <div className="mx-auto max-w-lg overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/40 p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] backdrop-blur-3xl ring-1 ring-black/5">
          <div className="flex items-center gap-2 rounded-[2rem] bg-white/60 p-1">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-14 border-none bg-transparent px-5 text-lg font-medium shadow-none focus-visible:ring-0 placeholder:text-gray-400"
              />
              <AnimatePresence>
                {inputValue.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:block pointer-events-none"
                  >
                    <div className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent backdrop-blur-sm">
                      Enter ↵
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              className={cn(
                "h-14 w-14 shrink-0 rounded-[1.75rem] p-0 transition-all duration-500 relative overflow-hidden",
                inputValue.trim()
                  ? "bg-gradient-to-tr from-accent via-accent to-pink-500 shadow-xl shadow-accent/40 scale-100"
                  : "bg-gray-100 text-gray-300 scale-95"
              )}
            >
              {inputValue.trim() && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"
                />
              )}
              <Plus
                size={28}
                className={cn(
                  "transition-all duration-500 ease-out z-10",
                  inputValue.trim() ? "rotate-90 scale-110 text-white" : "rotate-0 scale-90"
                )}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
