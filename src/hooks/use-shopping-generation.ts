"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { generateAllIngredientsAction } from "@/app/actions";
import type { PlanData, Item } from "@/lib/types";
import { trackAIAction } from "@/lib/analytics";
import { useParams } from "next/navigation";

interface UseShoppingGenerationParams {
  plan: PlanData;
  setPlan: (updater: (prev: PlanData) => PlanData) => void;
  slug: string;
  writeKey?: string;
  token?: string;
  readOnly?: boolean;
}

export function useShoppingGeneration({
  plan,
  setPlan,
  slug,
  writeKey,
  token,
  readOnly,
}: UseShoppingGenerationParams) {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [, startTransition] = useTransition();

  // Find all items without ingredients
  const itemsWithoutIngredients = useMemo(() => {
    const items: Array<{
      id: number;
      name: string;
      mealTitle: string;
      serviceTitle: string;
      adults: number;
      children: number;
      effectiveCount: number; // adults + children * 0.5
    }> = [];

    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (!item.ingredients || item.ingredients.length === 0) {
            // Get people count from service, with fallback to peopleCount or default
            const adults = service.adults ?? service.peopleCount ?? 0;
            const children = service.children ?? 0;
            const effectiveCount = adults + children * 0.5;

            items.push({
              id: item.id,
              name: item.name,
              mealTitle: meal.title || meal.date,
              serviceTitle: service.title,
              adults,
              children,
              effectiveCount,
            });
          }
        });
      });
    });

    return items;
  }, [plan.meals]);

  const generateAllIngredients = async (selectedIds?: Set<number>) => {
    if (readOnly || itemsWithoutIngredients.length === 0) {
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: itemsWithoutIngredients.length });

    // Prepare items with actions
    const itemsPayload = itemsWithoutIngredients.map((item) => ({
      id: item.id,
      action: selectedIds
        ? selectedIds.has(item.id)
          ? ("generate" as const)
          : ("categorize" as const)
        : ("generate" as const), // Default to generate if no selection passed (legacy behavior)
    }));

    try {
      const result = await generateAllIngredientsAction({
        slug,
        key: writeKey,
        token: token ?? undefined,
        locale,
        items: itemsPayload,
      });

      if (!result.success) {
        toast.error(result.error);
        setIsGenerating(false);
        setProgress(null);
        return;
      }

      const { processed, failed, errors } = result.data;

      // Refresh plan data by re-fetching (we'll need to trigger a refresh)
      // For now, we'll use optimistic updates where possible
      startTransition(() => {
        // Trigger a page refresh to get updated data
        // In a real implementation, you might want to refetch the plan data
        window.location.reload();
      });

      if (failed > 0) {
        toast.warning(
          `${processed} plats traités, ${failed} échecs. ${errors.map((e) => e.itemName).join(", ")}`
        );
      } else {
        toast.success(`${processed} plats traités avec succès`);
      }

      trackAIAction("ai_ingredients_generated_batch", "", processed);

      setIsGenerating(false);
      setProgress(null);
    } catch (error) {
      console.error("Failed to generate all ingredients:", error);
      toast.error("Erreur lors de la génération des ingrédients");
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return {
    itemsWithoutIngredients,
    isGenerating,
    progress,
    generateAllIngredients,
    count: itemsWithoutIngredients.length,
  };
}
