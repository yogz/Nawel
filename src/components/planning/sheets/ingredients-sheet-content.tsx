"use client";

import { useMemo } from "react";
import { ItemIngredientsManager } from "@/features/items/components/item-ingredients-manager";
import type { Sheet, Item, Service } from "@/lib/types";
import { useTranslations } from "next-intl";

interface IngredientsSheetContentProps {
  sheet: Extract<Sheet, { type: "item-ingredients" }>;
  setSheet: (sheet: Sheet | null) => void;
  locale: string;
  readOnly?: boolean;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setSuccessMessage: (msg: { text: string; type?: "success" | "error" } | null) => void;
  currentUserId?: string;
  onAuth: () => void;
  // Handlers - matching OrganizerHandlers types exactly
  findItem: (id: number) => { item: Item; service: Service; mealId?: number } | null | undefined;
  handleGenerateIngredients: (
    itemId: number,
    name: string,
    adults?: number,
    children?: number,
    peopleCount?: number,
    locale?: string
  ) => Promise<void>;
  handleToggleIngredient: (id: number, itemId: number, checked: boolean) => void;
  handleDeleteIngredient: (id: number, itemId: number) => void;
  handleCreateIngredient: (itemId: number, name: string, qty?: string) => void;
  handleDeleteAllIngredients: (itemId: number) => void;
  handleSaveFeedback?: (itemId: number, rating: number) => Promise<void>;
  justGenerated?: number | null;
}

export function IngredientsSheetContent({
  sheet,
  setSheet,
  locale,
  readOnly,
  isGenerating,
  setIsGenerating,
  setSuccessMessage,
  currentUserId,
  onAuth,
  findItem,
  handleGenerateIngredients,
  handleToggleIngredient,
  handleDeleteIngredient,
  handleCreateIngredient,
  handleDeleteAllIngredients,
  handleSaveFeedback,
  justGenerated,
}: IngredientsSheetContentProps) {
  const t = useTranslations("EventDashboard.Sheets");

  const itemIngredients = useMemo(() => {
    const found = findItem(sheet.itemId);
    return found?.item.ingredients || sheet.ingredients;
  }, [sheet.itemId, sheet.ingredients, findItem]);

  const itemNote = useMemo(() => {
    const found = findItem(sheet.itemId);
    return found?.item.note || undefined;
  }, [sheet.itemId, findItem]);

  const handleGenerate = async (name: string, note?: string) => {
    setIsGenerating(true);
    try {
      const found = findItem(sheet.itemId);
      const adults = found?.service.adults;
      const children = found?.service.children;
      const peopleCount = found?.service.peopleCount;

      let finalPeopleCount = peopleCount;
      if (note) {
        const match = note.match(/Pour (\d+) personne/i);
        if (match) {
          finalPeopleCount = parseInt(match[1]);
        }
      }

      await handleGenerateIngredients(
        sheet.itemId,
        name,
        adults,
        children,
        finalPeopleCount,
        locale
      );
      setSuccessMessage({ text: t("ingredientsGenerated"), type: "success" });
    } catch (error) {
      console.error("Failed to generate ingredients:", error);
      setSuccessMessage({ text: t("generationError"), type: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ItemIngredientsManager
      itemId={sheet.itemId}
      itemName={sheet.itemName}
      ingredients={itemIngredients || []}
      onToggleIngredient={(id, checked) => handleToggleIngredient(id, sheet.itemId, checked)}
      onDeleteIngredient={(id) => handleDeleteIngredient(id, sheet.itemId)}
      onCreateIngredient={(name, qty) => handleCreateIngredient(sheet.itemId, name, qty)}
      onDeleteAll={() => handleDeleteAllIngredients(sheet.itemId)}
      onGenerateIngredients={handleGenerate}
      isGenerating={isGenerating}
      isAuthenticated={!!currentUserId}
      onRequestAuth={onAuth}
      itemNote={itemNote}
      onSaveFeedback={handleSaveFeedback}
      justGenerated={justGenerated === sheet.itemId}
      onClose={() => setSheet(null)}
      readOnly={readOnly}
    />
  );
}
