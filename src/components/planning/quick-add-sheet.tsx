"use client";

import { QuickListInput } from "../common/quick-list-input";
import { useTranslations } from "next-intl";
import { OrganizerHandlers } from "@/lib/types";
import { useState } from "react";

interface QuickAddSheetContentProps {
  serviceId: number;
  handlers: OrganizerHandlers;
}

/**
 * Content for the quick-add sheet.
 * This component is rendered inside the OrganizerSheets Drawer.
 */
export function QuickAddSheetContent({ serviceId, handlers }: QuickAddSheetContentProps) {
  const t = useTranslations("EventDashboard.Organizer");
  const [sessionItems, setSessionItems] = useState<string[]>([]);

  const handleAdd = (text: string) => {
    // Optimistic UI update for the quick list
    setSessionItems((prev) => [text, ...prev]);

    // Actual backend/state update
    handlers.handleCreateItem({
      name: text,
      serviceId: serviceId,
      quantity: "1", // Default quantity
    });
  };

  const handleRemove = (index: number) => {
    // We only allow removing from the "session" view visually
    setSessionItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-[70vh] w-full overflow-hidden -mx-4 sm:-mx-6">
      <QuickListInput
        items={sessionItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
        title={t("quickAddTitle")}
        placeholder={t("quickAddPlaceholder")}
        className="h-full bg-white"
      />
    </div>
  );
}
