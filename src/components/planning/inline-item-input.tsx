"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Loader2, ArrowRight, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface InlineItemInputProps {
  onAdd: (name: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  serviceName?: string;
}

export function InlineItemInput({
  onAdd,
  placeholder,
  className,
  serviceName,
}: InlineItemInputProps) {
  const t = useTranslations("EventDashboard.Organizer");
  const tPlanning = useTranslations("EventDashboard.Planning");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(trimmed);
      setValue("");
      // Keep focus on input for rapid entry
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [value, isSubmitting, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Dynamic placeholder logic
  const displayPlaceholder =
    placeholder ||
    (serviceName
      ? t("quickAddPlaceholderService", { service: serviceName })
      : tPlanning("addItemPlaceholder"));

  return (
    <div className={cn("relative group transition-all duration-300", className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-md transition-all duration-300",
          isFocused
            ? "bg-white input-focus-glow is-focused ring-2 ring-violet-500/20"
            : "bg-transparent"
        )}
      />

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={displayPlaceholder}
        disabled={isSubmitting}
        className={cn(
          "relative z-10 h-11 pl-10 pr-12 text-sm transition-all duration-300 text-text",
          "placeholder:text-muted-foreground placeholder:transition-opacity",
          isFocused
            ? "border-accent bg-surface placeholder:opacity-40"
            : "border-dashed border-border bg-transparent opacity-70 hover:opacity-100 hover:bg-white/5 dark:hover:bg-white/10 hover:border-accent/50",
          isSubmitting && "opacity-50"
        )}
      />

      {/* Left Icon (Plus or Loading) */}
      <div
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-colors duration-300",
          isFocused ? "text-violet-500" : "text-gray-400 group-hover:text-gray-500"
        )}
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} strokeWidth={isFocused ? 2.5 : 2} />
        )}
      </div>

      {/* Right Action (Enter Key Hint) */}
      <AnimatePresence>
        {value.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -5 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1"
          >
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-violet-200 transition-colors"
            >
              <span>Enter</span>
              <CornerDownLeft size={10} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
