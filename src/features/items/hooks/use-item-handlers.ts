"use client";

import { useTransition } from "react";
import confetti from "canvas-confetti";
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  assignItemAction,
  moveItemAction,
  toggleItemCheckedAction,
} from "@/app/actions";
import type { Item, Service, Person, PlanData, ItemData } from "@/lib/types";
import type { ItemHandlerParams } from "@/features/shared/types";
import { trackItemAction, trackDragDrop } from "@/lib/analytics";

export function useItemHandlers({
  plan,
  setPlan,
  slug,
  writeKey,
  readOnly,
  setSheet,
  setSuccessMessage,
}: ItemHandlerParams) {
  const [, startTransition] = useTransition();

  const setServiceItems = (serviceId: number, updater: (items: Item[]) => Item[]) => {
    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) =>
          service.id === serviceId ? { ...service, items: updater(service.items) } : service
        ),
      })),
    }));
  };

  const findItem = (itemId: number): { item: Item; service: Service; mealId: number } | null => {
    for (const meal of plan.meals) {
      for (const service of meal.services) {
        const item = (service.items as Item[]).find((i: Item) => i.id === itemId);
        if (item) {
          return { item, service, mealId: meal.id };
        }
      }
    }
    return null;
  };

  const handleCreateItem = (data: ItemData) => {
    if (readOnly) {
      return;
    }
    if (typeof data.serviceId !== "number") {
      console.error("Missing serviceId for item creation");
      return;
    }
    // Type assertion safe because we checked serviceId
    const itemData = data as ItemData & { serviceId: number };
    startTransition(async () => {
      try {
        const created = await createItemAction({ ...itemData, slug, key: writeKey });
        const person = itemData.personId
          ? (plan.people.find((p) => p.id === itemData.personId) ?? null)
          : null;
        setServiceItems(itemData.serviceId, (items) => [...items, { ...created, person }]);
        setSheet(null);
        setSuccessMessage({ text: `${itemData.name} ajouté ! ✨`, type: "success" });
        trackItemAction("item_created", itemData.name);
      } catch (error) {
        console.error("Failed to create item:", error);
        setSuccessMessage({ text: "Erreur lors de l'ajout ❌", type: "error" });
      }
    });
  };

  const handleUpdateItem = (itemId: number, values: Partial<Item>, closeSheet = false) => {
    if (readOnly) {
      return;
    }
    const found = findItem(itemId);
    if (!found) {
      return;
    }

    const updatedItem = { ...found.item, ...values };

    startTransition(async () => {
      await updateItemAction({
        id: itemId,
        name: updatedItem.name,
        quantity: updatedItem.quantity,
        note: updatedItem.note,
        price: updatedItem.price ?? null,
        personId: updatedItem.personId ?? null,
        slug,
        key: writeKey,
      });
      setServiceItems(found.service.id, (items) =>
        items.map((it) => (it.id === itemId ? updatedItem : it))
      );
      setSuccessMessage({ text: "Modifications enregistrées ✓", type: "success" });
      trackItemAction("item_updated", updatedItem.name);
      if (closeSheet) {
        setSheet(null);
      }
    });
  };

  const handleAssign = (item: Item, personId: number | null) => {
    if (readOnly) {
      return;
    }

    setServiceItems(item.serviceId, (items) =>
      items.map((it) =>
        it.id === item.id
          ? {
              ...it,
              personId,
              person: personId
                ? (plan.people.find((p: Person) => p.id === personId) ?? null)
                : null,
            }
          : it
      )
    );
    setSheet(null);

    const person = personId ? plan.people.find((p: Person) => p.id === personId) : null;
    const personName = person?.name || "À prévoir";
    setSuccessMessage({ text: `Article assigné à ${personName} ✓`, type: "success" });
    trackItemAction("item_assigned", item.name, { assigned_to: personName });

    // Easter egg for Cécile
    if (
      person &&
      (person.name.toLowerCase() === "cécile" || person.name.toLowerCase() === "cecile")
    ) {
      const duration = 4 * 1000;
      const end = Date.now() + duration;
      const emojis = ["❤️", "💖", "💕", "🥂", "🌸", "🌺", "🌷", "✨"];
      const emojiShapes = emojis.map((e) => confetti.shapeFromText({ text: e }));

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          shapes: emojiShapes as confetti.Shape[],
          scalar: 2.5,
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          shapes: emojiShapes as confetti.Shape[],
          scalar: 2.5,
        });
        if (Math.random() > 0.7) {
          confetti({
            particleCount: 4,
            spread: 120,
            origin: { y: 0.6 },
            shapes: emojiShapes as confetti.Shape[],
            scalar: 3.5,
          });
        }
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    startTransition(async () => {
      await assignItemAction({ id: item.id, personId, slug, key: writeKey });
    });
  };

  const handleDelete = (item: Item) => {
    if (readOnly) {
      return;
    }
    const previousPlan = plan;
    setServiceItems(item.serviceId, (items) => items.filter((i) => i.id !== item.id));
    setSheet(null);
    setSuccessMessage({ text: `${item.name} supprimé ✓`, type: "success" });
    trackItemAction("item_deleted", item.name);

    startTransition(async () => {
      try {
        await deleteItemAction({ id: item.id, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to delete item:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: "Erreur lors de la suppression ❌", type: "error" });
      }
    });
  };

  const handleMoveItem = (itemId: number, targetServiceId: number, targetOrder?: number) => {
    if (readOnly) {
      return;
    }
    const found = findItem(itemId);
    if (!found) {
      return;
    }

    const { item, service: sourceService } = found;
    if (sourceService.id === targetServiceId) {
      return;
    }

    trackItemAction("item_moved", item.name);
    trackDragDrop();

    startTransition(async () => {
      setServiceItems(sourceService.id, (items) => items.filter((i) => i.id !== itemId));
      setServiceItems(targetServiceId, (items) => {
        const newItems = [...items, { ...item, serviceId: targetServiceId }];
        if (targetOrder !== undefined && targetOrder < newItems.length) {
          const [moved] = newItems.splice(newItems.length - 1, 1);
          newItems.splice(targetOrder, 0, moved);
        }
        return newItems;
      });
      await moveItemAction({ itemId, targetServiceId, targetOrder, slug, key: writeKey });
    });
  };

  const handleToggleItemChecked = (itemId: number, checked: boolean) => {
    if (readOnly) {
      return;
    }

    const found = findItem(itemId);
    if (!found) {
      return;
    }

    // Optimistic update
    setServiceItems(found.service.id, (items) =>
      items.map((it) => (it.id === itemId ? { ...it, checked } : it))
    );

    startTransition(async () => {
      try {
        await toggleItemCheckedAction({ id: itemId, checked, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to toggle item checked:", error);
        // Revert on error
        setServiceItems(found.service.id, (items) =>
          items.map((it) => (it.id === itemId ? { ...it, checked: !checked } : it))
        );
      }
    });
  };

  return {
    handleCreateItem,
    handleUpdateItem,
    handleAssign,
    handleDelete,
    handleMoveItem,
    findItem,
    handleToggleItemChecked,
  };
}
