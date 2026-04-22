"use client";

import { useState } from "react";
import { QuickListInput, QuickListItem } from "@/components/common/quick-list-input";

export default function QuickListDemoPage() {
  const [items, setItems] = useState<QuickListItem[]>([]);

  const handleAdd = (name: string) => {
    setItems((prev) => [{ name, isNew: true }, ...prev]);
  };

  const handleRemove = (_item: QuickListItem, index: number) => {
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
