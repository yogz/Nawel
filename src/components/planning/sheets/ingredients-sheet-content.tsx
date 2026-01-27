"use client";

import { useMemo } from "react";
import { ItemIngredientsManager } from "@/features/items/components/item-ingredients-manager";
import type { Sheet, Item, Service } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";

interface IngredientsSheetContentProps {
  sheet: Extract<Sheet, { type: "item-ingredients" }>;
  setSheet: (sheet: Sheet | null) => void;
  locale: string;
  readOnly?: boolean;
  currentUserId?: string;
  // Handlers - matching OrganizerHandlers types exactly
  findItem: (id: number) => { item: Item; service: Service; mealId?: number } | null | undefined;
  handleToggleIngredient: (id: number, itemId: number, checked: boolean) => void;
  handleDeleteIngredient: (id: number, itemId: number) => void;
  handleCreateIngredient: (itemId: number, name: string, qty?: string) => void;
  handleDeleteAllIngredients: (itemId: number) => void;
}

export function IngredientsSheetContent({
  sheet,
  setSheet,
  locale,
  readOnly,
  currentUserId,
  findItem,
  handleToggleIngredient,
  handleDeleteIngredient,
  handleCreateIngredient,
  handleDeleteAllIngredients,
}: IngredientsSheetContentProps) {
  const itemIngredients = useMemo(() => {
    const found = findItem(sheet.itemId);
    // Prioritize updating from the plan if the item exists
    if (found) {
      return found.item.ingredients ?? [];
    }
    return sheet.ingredients;
  }, [sheet.itemId, sheet.ingredients, findItem]);

  return (
    <ItemIngredientsManager
      itemId={sheet.itemId}
      itemName={sheet.itemName}
      ingredients={itemIngredients || []}
      onToggleIngredient={(id, checked) => handleToggleIngredient(id, sheet.itemId, checked)}
      onDeleteIngredient={(id) => handleDeleteIngredient(id, sheet.itemId)}
      onCreateIngredient={(name, qty) => handleCreateIngredient(sheet.itemId, name, qty)}
      onDeleteAll={() => handleDeleteAllIngredients(sheet.itemId)}
      onClose={() => setSheet(null)}
      readOnly={readOnly}
    />
  );
}
