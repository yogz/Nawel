"use client";

import { useMemo } from "react";
import { ItemForm } from "@/features/items/components/item-form";
import type { PlanData, Item, Service, Sheet, ItemData } from "@/lib/types";
import { useTranslations } from "next-intl";

interface ItemSheetContentProps {
  sheet: Extract<Sheet, { type: "item" }>;
  setSheet: (sheet: Sheet | null) => void;
  plan: PlanData;
  locale: string;
  readOnly?: boolean;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setSuccessMessage: (msg: { text: string; type?: "success" | "error" } | null) => void;
  currentUserId?: string;
  onAuth: () => void;
  // Handlers - matching OrganizerHandlers types exactly
  findItem: (id: number) => { item: Item; service: Service; mealId?: number } | null | undefined;
  handleUpdateItem: (id: number, data: ItemData) => void;
  handleCreateItem: (data: ItemData) => void;
  handleAssign: (item: Item, personId: number | null) => void;
  handleMoveItem: (itemId: number, serviceId: number, index?: number) => void;
  handleDelete: (item: Item) => void;
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
  handleCreateIngredient: (itemId: number, name: string, quantity?: string) => void;
  handleDeleteAllIngredients: (itemId: number) => void;
}

export function ItemSheetContent({
  sheet,
  setSheet,
  plan,
  locale,
  readOnly,
  isGenerating,
  setIsGenerating,
  setSuccessMessage,
  currentUserId,
  onAuth,
  findItem,
  handleUpdateItem,
  handleCreateItem,
  handleAssign,
  handleMoveItem,
  handleDelete,
  handleGenerateIngredients,
  handleToggleIngredient,
  handleDeleteIngredient,
  handleCreateIngredient,
  handleDeleteAllIngredients,
}: ItemSheetContentProps) {
  const t = useTranslations("EventDashboard.Sheets");

  const defaultItem = useMemo(() => {
    if (!sheet.item) {
      return undefined;
    }
    const found = findItem(sheet.item.id);
    return found?.item || sheet.item;
  }, [sheet.item, findItem]);

  const allServices = useMemo(() => {
    return plan.meals.flatMap((m) =>
      m.services.map((s) => ({ ...s, mealTitle: m.title || m.date }))
    );
  }, [plan.meals]);

  const currentServiceId = sheet.serviceId || sheet.item?.serviceId;

  const servicePeopleCount = useMemo(() => {
    if (!currentServiceId) {
      return undefined;
    }
    for (const meal of plan.meals) {
      const service = meal.services.find((s) => s.id === currentServiceId);
      if (service) {
        return service.peopleCount;
      }
    }
    return undefined;
  }, [currentServiceId, plan.meals]);

  const itemIngredients = useMemo(() => {
    if (sheet.item) {
      const found = findItem(sheet.item.id);
      return found?.item.ingredients || sheet.item.ingredients;
    }
    return undefined;
  }, [sheet.item, findItem]);

  const getServiceInfo = (serviceId?: number) => {
    if (!serviceId) {
      return undefined;
    }
    return plan.meals.flatMap((m) => m.services).find((s) => s.id === serviceId);
  };

  const handleGenerate = async (currentName: string, currentNote?: string) => {
    if (!sheet.item) {
      return;
    }

    setIsGenerating(true);
    try {
      let peopleCount = undefined;
      if (currentNote) {
        const match = currentNote.match(/Pour (\d+) personne/i);
        if (match) {
          peopleCount = parseInt(match[1]);
        }
      }

      const sId = sheet.serviceId || sheet.item?.serviceId;
      const service = getServiceInfo(sId);

      await handleGenerateIngredients(
        sheet.item.id,
        currentName || sheet.item.name,
        service?.adults,
        service?.children,
        peopleCount || service?.peopleCount,
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
    <ItemForm
      people={plan.people}
      defaultItem={defaultItem}
      allServices={allServices}
      currentServiceId={currentServiceId}
      servicePeopleCount={servicePeopleCount}
      onSubmit={(vals) => {
        if (sheet.item) {
          handleUpdateItem(sheet.item.id, vals as ItemData);
        } else {
          handleCreateItem({ ...vals, serviceId: currentServiceId } as ItemData);
        }
      }}
      onAssign={(pId) => sheet.item && handleAssign(sheet.item, pId)}
      onMoveService={(sId) => sheet.item && handleMoveItem(sheet.item.id, sId)}
      onDelete={sheet.item ? () => handleDelete(sheet.item!) : undefined}
      readOnly={readOnly}
      ingredients={itemIngredients}
      onGenerateIngredients={sheet.item ? handleGenerate : undefined}
      onToggleIngredient={
        sheet.item
          ? (id: number, checked: boolean) => handleToggleIngredient(id, sheet.item!.id, checked)
          : undefined
      }
      onDeleteIngredient={
        sheet.item ? (id: number) => handleDeleteIngredient(id, sheet.item!.id) : undefined
      }
      onCreateIngredient={
        sheet.item
          ? (name: string, qty?: string) => handleCreateIngredient(sheet.item!.id, name, qty)
          : undefined
      }
      onDeleteAllIngredients={
        sheet.item ? () => handleDeleteAllIngredients(sheet.item!.id) : undefined
      }
      onManageIngredients={
        sheet.item
          ? () =>
              setSheet({
                type: "item-ingredients",
                itemId: sheet.item!.id,
                itemName: sheet.item!.name,
                ingredients: itemIngredients || [],
              })
          : undefined
      }
      isGenerating={isGenerating}
      isAuthenticated={!!currentUserId}
      onRequestAuth={onAuth}
      currentUserId={currentUserId}
    />
  );
}
