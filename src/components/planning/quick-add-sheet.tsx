"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ListPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { OrganizerHandlers, PlanData } from "@/lib/types";

interface QuickAddSheetContentProps {
  serviceId: number;
  handlers: OrganizerHandlers;
  plan: PlanData;
  onClose: () => void;
}

/**
 * Fullscreen quick-add component for rapidly adding items to a service.
 * Rendered outside the standard Drawer, similar to ItemIngredientsManager.
 */
export function QuickAddSheetContent({
  serviceId,
  handlers,
  plan,
  onClose,
}: QuickAddSheetContentProps) {
  const t = useTranslations("EventDashboard.Organizer");
  const tShared = useTranslations("EventDashboard.Shared");
  const [sessionItems, setSessionItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const service = plan.meals.flatMap((m) => m.services).find((s) => s.id === serviceId);
  const existingItems = service?.items || [];
  const title = service?.title || t("quickAddTitle");
  const placeholder = service?.title
    ? t("quickAddPlaceholderService", { service: service.title })
    : t("quickAddPlaceholder");

  const handleAdd = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      // Optimistic UI update
      setSessionItems((prev) => [trimmedValue, ...prev]);

      // Backend update (don't close sheet)
      handlers.handleCreateItem(
        {
          name: trimmedValue,
          serviceId: serviceId,
          quantity: "1",
        },
        false
      );

      setInputValue("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    setSessionItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when items are added (to keep focus near input)
  useEffect(() => {
    if (scrollRef.current && sessionItems.length > 0) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [sessionItems.length]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white duration-300 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ paddingTop: `max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))` }}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            {existingItems.length + sessionItems.length} {tShared("items")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200"
          aria-label={tShared("close")}
        >
          <X size={24} />
        </button>
      </div>

      {/* List Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {/* Existing items from service */}
        {existingItems.length > 0 && (
          <div className="mb-4 space-y-2">
            {existingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                <span className="flex-1">{item.name}</span>
                <button
                  onClick={() => handlers.handleDelete(item)}
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New items added this session */}
        {sessionItems.length > 0 && (
          <div className="flex flex-col-reverse gap-3">
            <AnimatePresence initial={false}>
              {sessionItems.map((item, index) => (
                <motion.div
                  key={`${item}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{
                    layout: { type: "spring", stiffness: 500, damping: 30 },
                  }}
                  className="group flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <ListPlus size={18} />
                  </div>
                  <span className="flex-1 text-base font-semibold text-gray-800">{item}</span>
                  <button
                    onClick={() => handleRemove(index)}
                    className="rounded-full p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90"
                  >
                    <X size={20} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state only if no items at all */}
        {existingItems.length === 0 && sessionItems.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
              <ListPlus className="text-gray-300" size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-gray-900">{t("quickAddEmptyTitle")}</p>
              <p className="text-sm text-gray-500">{placeholder}</p>
            </div>
          </div>
        )}

        {/* Padding for sticky input */}
        <div className="h-32" />
      </div>

      {/* Sticky Input Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-white/80 p-4 pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-14 rounded-2xl border-none bg-gray-100 px-5 text-base focus-visible:ring-2 focus-visible:ring-accent/20"
            />
            <AnimatePresence>
              {inputValue.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block"
                >
                  <div className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
                    Enter
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className={`h-14 w-14 shrink-0 rounded-2xl p-0 transition-all duration-300 ${
              inputValue.trim()
                ? "bg-accent shadow-lg shadow-accent/20 hover:bg-accent/90"
                : "bg-gray-100 text-gray-300"
            }`}
          >
            <Plus
              size={24}
              className={`transition-transform duration-300 ${inputValue.trim() ? "rotate-0 text-white" : "rotate-0"}`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
