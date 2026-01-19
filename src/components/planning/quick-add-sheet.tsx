"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { OrganizerHandlers, PlanData } from "@/lib/types";
import { QuickListInput, QuickListItem } from "../common/quick-list-input";

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
  const [sessionItems, setSessionItems] = useState<QuickListItem[]>([]);

  const service = plan.meals.flatMap((m) => m.services).find((s) => s.id === serviceId);
  const existingItems: QuickListItem[] = (service?.items || []).map((item) => ({
    id: item.id,
    name: item.name,
    isNew: false,
  }));

  // Combine: new items first, then existing items
  const allItems = [...sessionItems, ...existingItems];

  const title = service?.title || t("quickAddTitle");
  const placeholder = service?.title
    ? t("quickAddPlaceholderService", { service: service.title })
    : t("quickAddPlaceholder");

  const handleAdd = (name: string) => {
    // Optimistic UI update
    setSessionItems((prev) => [{ name, isNew: true }, ...prev]);

    // Backend update (don't close sheet)
    handlers.handleCreateItem(
      {
        name,
        serviceId: serviceId,
        quantity: "1",
      },
      false
    );
  };

  const handleRemove = (item: QuickListItem, index: number) => {
    if (item.id) {
      // Existing item - delete from backend (don't close sheet)
      const existingItem = service?.items.find((i) => i.id === item.id);
      if (existingItem) {
        handlers.handleDelete(existingItem, false);
      }
    } else {
      // New item - remove from session (adjust index for sessionItems)
      setSessionItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

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
            {allItems.length} {tShared("items")}
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

      {/* Quick List Input for all items */}
      <div className="flex-1 overflow-hidden">
        <QuickListInput
          items={allItems}
          onAdd={handleAdd}
          onRemove={handleRemove}
          placeholder={placeholder}
          className="h-full"
          hideCount
        />
      </div>
    </div>
  );
}
