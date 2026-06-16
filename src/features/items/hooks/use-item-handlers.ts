"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fireEmojiConfetti } from "@/lib/confetti";
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
  token,
}: ItemHandlerParams) {
  const [, startTransition] = useTransition();
  const t = useTranslations("Translations");

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

  // Returns true on success, false on failure. Awaiting the underlying action (instead of
  // fire-and-forget inside startTransition) is what lets callers like InlineItemInput keep their
  // submit guard locked until the item really exists — preventing double submissions / duplicate
  // toasts and preserving the typed value when the action fails.
  const handleCreateItem = async (data: ItemData, closeSheet = true): Promise<boolean> => {
    if (readOnly) {
      return false;
    }
    if (typeof data.serviceId !== "number") {
      console.error("Missing serviceId for item creation");
      return false;
    }
    // Type assertion safe because we checked serviceId
    const itemData = data as ItemData & { serviceId: number };
    try {
      const created = await createItemAction({
        ...itemData,
        slug,
        key: writeKey,
        token: token ?? undefined,
      });
      const person = itemData.personId
        ? (plan.people.find((p) => p.id === itemData.personId) ?? null)
        : null;
      startTransition(() => {
        setServiceItems(itemData.serviceId, (items) => [...items, { ...created, person }]);
        if (closeSheet) {
          setSheet(null);
        }
      });
      toast.success(t("item.added", { name: itemData.name }));
      trackItemAction("item_created", itemData.name);
      return true;
    } catch (error) {
      console.error("Failed to create item:", error);
      toast.error(t("item.errorAdd"));
      return false;
    }
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
    const previousPlan = plan;

    startTransition(async () => {
      setServiceItems(found.service.id, (items) =>
        items.map((it) => (it.id === itemId ? updatedItem : it))
      );
      if (closeSheet) {
        setSheet(null);
      }
      try {
        await updateItemAction({
          id: itemId,
          name: updatedItem.name,
          quantity: updatedItem.quantity,
          note: updatedItem.note,
          price: updatedItem.price ?? null,
          personId: updatedItem.personId ?? null,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
        toast.success(t("item.updated"));
        trackItemAction("item_updated", updatedItem.name);
      } catch (error) {
        console.error("Failed to update item:", error);
        setPlan(previousPlan);
        toast.error(t("item.errorUpdate"));
      }
    });
  };

  const handleAssign = (item: Item, personId: number | null) => {
    if (readOnly) {
      return;
    }

    const previousPlan = plan;
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

    startTransition(async () => {
      try {
        await assignItemAction({
          id: item.id,
          personId,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
        toast.success(t("person.claimed"));
        trackItemAction("item_assigned", item.name, { assigned_to: personName });

        // Easter egg for Cécile
        if (
          person &&
          (person.name.toLowerCase() === "cécile" || person.name.toLowerCase() === "cecile")
        ) {
          fireEmojiConfetti();
        }
      } catch (error) {
        console.error("Failed to assign item:", error);
        setPlan(previousPlan);
        toast.error(t("person.errorClaim"));
      }
    });
  };

  const handleDelete = (item: Item, closeSheet = true) => {
    if (readOnly) {
      return;
    }
    const previousPlan = plan;
    setServiceItems(item.serviceId, (items) => items.filter((i) => i.id !== item.id));
    if (closeSheet) {
      setSheet(null);
    }
    toast.success(t("item.deleted", { name: item.name }));
    trackItemAction("item_deleted", item.name);

    startTransition(async () => {
      try {
        await deleteItemAction({ id: item.id, slug, key: writeKey, token: token ?? undefined });
      } catch (error) {
        console.error("Failed to delete item:", error);
        setPlan(previousPlan);
        toast.error(t("item.errorDelete"));
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

    const previousPlan = plan;
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
      try {
        await moveItemAction({
          itemId,
          targetServiceId,
          targetOrder,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
        toast.success(t("item.moved"));
      } catch (error) {
        console.error("Failed to move item:", error);
        setPlan(previousPlan);
        toast.error(t("item.errorMove"));
      }
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
        await toggleItemCheckedAction({
          id: itemId,
          checked,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
        toast.success(checked ? t("item.checked") : t("item.unchecked"));
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
