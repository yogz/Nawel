"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface InlineItemInputProps {
  onAdd: (name: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

export function InlineItemInput({ onAdd, placeholder, className }: InlineItemInputProps) {
  const t = useTranslations("EventDashboard.Planning");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("addItemPlaceholder")}
          disabled={isSubmitting}
          className="h-11 border-gray-200 bg-white/60 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-accent/30 focus:bg-white focus:ring-accent/20"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || isSubmitting}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all",
          value.trim() && !isSubmitting
            ? "bg-accent text-white shadow-md shadow-accent/20 active:scale-95"
            : "bg-gray-100 text-gray-400"
        )}
        aria-label={t("addItem")}
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
      </button>
    </div>
  );
}
