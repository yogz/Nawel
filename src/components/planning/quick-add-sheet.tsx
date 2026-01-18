import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QuickListInput } from "../common/quick-list-input";
import { useTranslations } from "next-intl";
import { OrganizerHandlers } from "@/lib/types";
import { useState } from "react";

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  handlers: OrganizerHandlers;
}

export function QuickAddSheet({ isOpen, onClose, serviceId, handlers }: QuickAddSheetProps) {
  const t = useTranslations("EventDashboard.Organizer");
  const [sessionItems, setSessionItems] = useState<string[]>([]);

  // Find the service name to display in the title
  // This is a bit tricky since we don't have direct access to the plan here without passing it down
  // But for now a generic title is fine or we can pass the title if needed later.

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
    // Actual deletion would require knowing the item ID which we don't get back immediately here
    // So for now this just clears it from the visual "just added" list
    setSessionItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] rounded-t-[2rem] border-0 p-0 sm:max-w-md mx-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("quickAdd")}</SheetTitle>
        </SheetHeader>

        <div className="h-full w-full overflow-hidden rounded-t-[2rem]">
          <QuickListInput
            items={sessionItems}
            onAdd={handleAdd}
            onRemove={handleRemove}
            title={t("quickAddTitle")}
            placeholder={t("quickAddPlaceholder")}
            className="h-full bg-white"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
