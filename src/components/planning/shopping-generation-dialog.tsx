"use client";

import * as React from "react";
import { Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface ShoppingGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{
    id: number;
    name: string;
    mealTitle: string;
    serviceTitle: string;
  }>;
  onConfirm: (selectedItemIds: Set<number>) => Promise<void>;
  isGenerating: boolean;
}

export function ShoppingGenerationDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isGenerating,
}: ShoppingGenerationDialogProps) {
  const t = useTranslations("EventDashboard.Shopping");
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    new Set(items.map((i) => i.id))
  );

  // Reset selection when items change or dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [open, items]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const unselectedCount = items.length - selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-2xl">
        <DialogHeader className="bg-gradient-to-b from-purple-50 to-transparent px-6 pb-6 pt-8 text-left dark:from-purple-950/30 dark:to-transparent">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <Sparkles className="text-white" size={24} />
          </div>
          <DialogTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-center text-xl font-bold text-transparent dark:from-purple-400 dark:to-pink-400">
            {t("generateDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {t("generateDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto px-6 py-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {items.length} {t("items")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-auto p-0 text-xs font-semibold text-accent hover:bg-transparent hover:text-accent/80"
            >
              {selectedIds.size === items.length
                ? t("generateDialog.deselectAll")
                : t("generateDialog.selectAll")}
            </Button>
          </div>

          <div className="space-y-2 py-2">
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:bg-muted/50",
                    isSelected
                      ? "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30"
                      : "border-border bg-card"
                  )}
                  onClick={() => handleToggle(item.id)}
                >
                  <div
                    className={clsx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                      isSelected
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-muted-foreground/30 bg-background group-hover:border-purple-400"
                    )}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={clsx(
                        "font-medium leading-none transition-colors",
                        isSelected ? "text-purple-900 dark:text-purple-100" : "text-foreground"
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.mealTitle} · {item.serviceTitle}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 p-6">
          <div className="flex w-full flex-col gap-3">
            <AnimatePresence>
              {unselectedCount > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <p>
                    {t.rich("generateDialog.categorizeNotice", {
                      count: unselectedCount,
                      bold: (chunks) => <span className="font-semibold">{chunks}</span>,
                    })}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={() => onConfirm(selectedIds)}
              disabled={isGenerating}
              className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/30 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t("generateDialog.confirmButton", {
                    generateCount: selectedIds.size,
                    categorizeCount: unselectedCount,
                  })}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
