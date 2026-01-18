"use client";

import { useState } from "react";
import { QuickListInput } from "@/components/common/quick-list-input";
import { useTranslations } from "next-intl";

export default function QuickListDemoPage() {
  const [items, setItems] = useState<string[]>([]);

  const handleAdd = (item: string) => {
    setItems((prev) => [item, ...prev]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <QuickListInput
          items={items}
          onAdd={handleAdd}
          onRemove={handleRemove}
          title="Demo Quick List"
          placeholder="Tapez un ingrédient ou une tâche..."
        />
      </div>
    </div>
  );
}
