"use client";

import { useTransition } from "react";
import { createPersonAction, updatePersonAction, deletePersonAction } from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { PersonHandlerParams } from "@/features/shared/types";

export function usePersonHandlers({
  plan,
  setPlan,
  slug,
  writeKey,
  readOnly,
  setSheet,
  setSuccessMessage,
  setSelectedPerson,
}: PersonHandlerParams) {
  const [, startTransition] = useTransition();

  const handleCreatePerson = (name: string, emoji?: string | null) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createPersonAction({
          name,
          emoji: emoji ?? undefined,
          slug,
          key: writeKey,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: [...prev.people, created].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setSelectedPerson?.(created.id);
        setSheet(null);
        setSuccessMessage({ text: `${name} ajouté(e) ! ✨`, type: "success" });
      } catch (error) {
        console.error("Failed to create person:", error);
        setSuccessMessage({ text: "Erreur lors de l'ajout ❌", type: "error" });
      }
    });
  };

  const handleUpdatePerson = (id: number, name: string, emoji?: string | null) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updatePersonAction({ id, name, emoji, slug, key: writeKey });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: prev.people.map((p) => (p.id === id ? { ...p, name, emoji: emoji ?? null } : p)),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Convive mis à jour ✓", type: "success" });
      } catch (error) {
        console.error("Failed to update person:", error);
        setSuccessMessage({ text: "Erreur lors de la mise à jour ❌", type: "error" });
      }
    });
  };

  const handleDeletePerson = (id: number) => {
    if (readOnly) {
      return;
    }
    const previousPlan = plan;
    const person = plan.people.find((p) => p.id === id);
    setPlan((prev: PlanData) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.personId === id ? { ...item, personId: null, person: null } : item
          ),
        })),
      })),
    }));
    setSheet(null);
    setSuccessMessage({ text: `${person?.name || "Convive"} supprimé ✓`, type: "success" });

    startTransition(async () => {
      try {
        await deletePersonAction({ id, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to delete person:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: "Erreur lors de la suppression ❌", type: "error" });
      }
    });
  };

  return {
    handleCreatePerson,
    handleUpdatePerson,
    handleDeletePerson,
  };
}
