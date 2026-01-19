"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ListPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface QuickListInputProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove?: (index: number) => void;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when items are added to keep the focus near the input
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
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
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none"
        style={{ paddingBottom: "120px" }} // Space for the floating input
      >
        <div className="flex flex-col-reverse gap-3">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={`${item}-${index}`}
                layout
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 1,
                  },
                }}
                className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-pink-500/10 text-accent transition-transform group-hover:scale-110">
                  <ListPlus size={18} />
                </div>
                <span className="flex-1 text-base font-semibold text-gray-800">{item}</span>
                {onRemove && (
                  <button
                    onClick={() => onRemove(index)}
                    className="opacity-0 transition-all group-hover:opacity-100 rounded-full p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 active:scale-90"
                  >
                    <X size={20} />
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
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-10 sm:pb-6">
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

      {/* Safe Area Spacer for iOS/Mobile */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/50" />
    </div>
  );
}
