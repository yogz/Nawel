"use client";

import { useTransition } from "react";
import confetti from "canvas-confetti";
import {
    createItemAction, updateItemAction, deleteItemAction, assignItemAction,
    createDayAction, updateDayAction, deleteDayAction, createDayWithMealsAction,
    createMealAction, updateMealTitleAction, deleteMealAction,
    createPersonAction, updatePersonAction,
    deletePersonAction, moveItemAction, deleteEventAction
} from "@/app/actions";
import { PlanData, Item, Meal, Person } from "@/lib/types";
import { SheetState } from "./use-event-state";

interface UseEventHandlersParams {
    plan: PlanData;
    setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
    slug: string;
    writeKey?: string;
    readOnly: boolean;
    setSheet: (sheet: SheetState | null) => void;
    setSuccessMessage: (message: string | null) => void;
    setSelectedPerson?: (id: number | null) => void;
}

export function useEventHandlers({
    plan,
    setPlan,
    slug,
    writeKey,
    readOnly,
    setSheet,
    setSuccessMessage,
    setSelectedPerson
}: UseEventHandlersParams) {
    const [, startTransition] = useTransition();

    const setMealItems = (mealId: number, updater: (items: Item[]) => Item[]) => {
        setPlan((prev: PlanData) => ({
            ...prev,
            days: prev.days.map((day) => ({
                ...day,
                meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, items: updater(meal.items) } : meal)),
            })),
        }));
    };

    const handleCreateItem = (data: { mealId: number; name: string; quantity?: string; note?: string; price?: number }) => {
        if (readOnly) return;
        startTransition(async () => {
            const created = await createItemAction({ ...data, slug, key: writeKey });
            setMealItems(data.mealId, (items) => [...items, { ...created, person: null }]);
            setSheet(null);
        });
    };

    const handleUpdateItem = (itemId: number, values: Partial<Item>, closeSheet = false) => {
        if (readOnly) return;
        const found = findItem(itemId);
        if (!found) return;

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
            setMealItems(found.meal.id, (items) => items.map((it) => (it.id === itemId ? updatedItem : it)));
            if (closeSheet) setSheet(null);
        });
    };

    const handleAssign = (item: Item, personId: number | null) => {
        if (readOnly) return;

        setMealItems(item.mealId, (items) =>
            items.map((it) => (it.id === item.id ? { ...it, personId, person: personId ? plan.people.find((p: Person) => p.id === personId) ?? null : null } : it))
        );
        setSheet(null);

        const person = personId ? plan.people.find((p: Person) => p.id === personId) : null;
        const personName = person?.name || "À prévoir";
        setSuccessMessage(`Article assigné à ${personName} ✓`);
        setTimeout(() => setSuccessMessage(null), 3000);

        if (person && (person.name.toLowerCase() === "cécile" || person.name.toLowerCase() === "cecile")) {
            const duration = 4 * 1000;
            const end = Date.now() + duration;
            const emojis = ['❤️', '💖', '💕', '🥂', '🌸', '🌺', '🌷', '✨'];
            const emojiShapes = emojis.map(e => confetti.shapeFromText({ text: e }));

            const frame = () => {
                confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, shapes: emojiShapes as any, scalar: 2.5 });
                confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, shapes: emojiShapes as any, scalar: 2.5 });
                if (Math.random() > 0.7) confetti({ particleCount: 4, spread: 120, origin: { y: 0.6 }, shapes: emojiShapes as any, scalar: 3.5 });
                if (Date.now() < end) requestAnimationFrame(frame);
            };
            frame();
        }

        startTransition(async () => {
            await assignItemAction({ id: item.id, personId, slug, key: writeKey });
        });
    };

    const handleDelete = (item: Item) => {
        if (readOnly) return;
        const previousPlan = plan;
        setMealItems(item.mealId, (items) => items.filter((i) => i.id !== item.id));
        setSheet(null);
        startTransition(async () => {
            try {
                await deleteItemAction({ id: item.id, slug, key: writeKey });
            } catch (error) {
                console.error("Failed to delete item:", error);
                setPlan(previousPlan);
                alert("Erreur lors de la suppression de l'article.");
            }
        });
    };

    const findItem = (itemId: number): { item: Item; meal: Meal; dayId: number } | null => {
        for (const day of plan.days) {
            for (const meal of day.meals) {
                const item = (meal.items as Item[]).find((i: Item) => i.id === itemId);
                if (item) return { item, meal, dayId: day.id };
            }
        }
        return null;
    };

    const handleMoveItem = (itemId: number, targetMealId: number, targetOrder?: number) => {
        if (readOnly) return;
        const found = findItem(itemId);
        if (!found) return;

        const { item, meal: sourceMeal } = found;
        if (sourceMeal.id === targetMealId) return;

        startTransition(async () => {
            setMealItems(sourceMeal.id, (items) => items.filter((i) => i.id !== itemId));
            setMealItems(targetMealId, (items) => {
                const newItems = [...items, { ...item, mealId: targetMealId }];
                if (targetOrder !== undefined && targetOrder < newItems.length) {
                    const [moved] = newItems.splice(newItems.length - 1, 1);
                    newItems.splice(targetOrder, 0, moved);
                }
                return newItems;
            });
            await moveItemAction({ itemId, targetMealId, targetOrder, slug, key: writeKey });
        });
    };

    const handleCreateDay = async (date: string, title?: string): Promise<number> => {
        if (readOnly) return 0;
        try {
            const created = await createDayAction({ date, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                days: [...prev.days, { ...created, meals: [] }].sort((a, b) => a.date.localeCompare(b.date)),
            }));
            return created.id;
        } catch (error) {
            console.error("Failed to create day:", error);
            alert("Erreur lors de la création du jour. Vérifiez les logs console.");
            return 0;
        }
    };

    const handleCreateDayWithMeals = (date: string, title: string | undefined, meals: string[]) => {
        if (readOnly) return;
        startTransition(async () => {
            try {
                const created = await createDayWithMealsAction({ date, title, meals, slug, key: writeKey });
                setPlan((prev: PlanData) => ({
                    ...prev,
                    days: [...prev.days, created].sort((a, b) => a.date.localeCompare(b.date)),
                }));
                setSheet(null);
                setSuccessMessage("Nouveau jour créé avec succès ✨");
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (error) {
                console.error("Failed to create day with meals:", error);
                alert("Erreur lors de la création du jour avec repas.");
            }
        });
    };

    const handleCreateMeal = (dayId: number, title: string) => {
        if (readOnly) return;
        startTransition(async () => {
            const created = await createMealAction({ dayId, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                days: prev.days.map((d) => (d.id === dayId ? { ...d, meals: [...d.meals, { ...created, items: [] }] } : d)),
            }));
            setSheet(null);
        });
    };

    const handleUpdateMealTitle = (id: number, title: string) => {
        if (readOnly) return;
        startTransition(async () => {
            await updateMealTitleAction({ id, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                days: prev.days.map((d) => ({
                    ...d,
                    meals: d.meals.map((m) => (m.id === id ? { ...m, title } : m)),
                })),
            }));
            setSheet(null);
        });
    };

    const handleDeleteMeal = (id: number) => {
        if (readOnly) return;
        if (!confirm("Supprimer ce repas et tous ses articles ?")) return;
        const previousPlan = plan;
        setPlan((prev: PlanData) => ({
            ...prev,
            days: prev.days.map((d) => ({
                ...d,
                meals: d.meals.filter((m) => m.id !== id),
            })),
        }));
        setSheet(null);
        startTransition(async () => {
            try {
                await deleteMealAction({ id, slug, key: writeKey });
            } catch (error) {
                console.error("Failed to delete meal:", error);
                setPlan(previousPlan);
                alert("Erreur lors de la suppression du repas.");
            }
        });
    };

    const handleUpdateDay = (id: number, date: string, title?: string | null) => {
        if (readOnly) return;
        startTransition(async () => {
            await updateDayAction({ id, date, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                days: prev.days.map((d) => (d.id === id ? { ...d, date, title: title ?? null } : d)),
            }));
            setSheet(null);
        });
    };

    const handleDeleteDay = (id: number) => {
        if (readOnly) return;
        if (!confirm("Supprimer ce jour et tous ses repas ?")) return;
        const previousPlan = plan;
        setPlan((prev: PlanData) => ({
            ...prev,
            days: prev.days.filter((d) => d.id !== id),
        }));
        setSheet(null);
        startTransition(async () => {
            try {
                await deleteDayAction({ id, slug, key: writeKey });
            } catch (error) {
                console.error("Failed to delete day:", error);
                setPlan(previousPlan);
                alert("Erreur lors de la suppression du jour.");
            }
        });
    };

    const handleCreatePerson = (name: string, emoji?: string | null) => {
        if (readOnly) return;
        startTransition(async () => {
            try {
                const created = await createPersonAction({ name, emoji: emoji ?? undefined, slug, key: writeKey });
                setPlan((prev: PlanData) => ({
                    ...prev,
                    people: [...prev.people, created].sort((a, b) => a.name.localeCompare(b.name))
                }));
                setSelectedPerson?.(created.id);
                setSheet(null);
                setSuccessMessage(`${name} a été ajouté(e) aux convives ✨`);
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (error) {
                console.error("Failed to create person:", error);
                alert("Erreur lors de l'ajout du convive.");
            }
        });
    };

    const handleUpdatePerson = (id: number, name: string, emoji: string | null) => {
        if (readOnly) return;
        startTransition(async () => {
            await updatePersonAction({ id, name, emoji, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                people: prev.people.map((p) => (p.id === id ? { ...p, name, emoji } : p)),
            }));
            setSheet(null);
        });
    };

    const handleDeletePerson = (id: number) => {
        if (readOnly) return;
        if (!confirm("Es-tu sûr de vouloir supprimer ce convive ? Tous ses articles deviendront 'À prévoir'.")) return;
        const previousPlan = plan;
        setPlan((prev: PlanData) => ({
            ...prev,
            people: prev.people.filter((p) => p.id !== id),
            days: prev.days.map((day) => ({
                ...day,
                meals: day.meals.map((meal) => ({
                    ...meal,
                    items: meal.items.map((item) => (item.personId === id ? { ...item, personId: null, person: null } : item)),
                })),
            })),
        }));
        setSheet(null);

        startTransition(async () => {
            try {
                await deletePersonAction({ id, slug, key: writeKey });
            } catch (error) {
                console.error("Failed to delete person:", error);
                setPlan(previousPlan);
                alert("Erreur lors de la suppression du convive.");
            }
        });
    };

    const handleDeleteEvent = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
        startTransition(async () => {
            try {
                const result = await deleteEventAction({ slug, key: writeKey });
                if (result.success) {
                    setSuccessMessage("Événement supprimé avec succès.");
                    setTimeout(() => { window.location.href = "/"; }, 1500);
                }
            } catch (error) {
                console.error("Failed to delete event:", error);
                alert("Erreur lors de la suppression de l'événement.");
            }
        });
    };

    return {
        handleCreateItem, handleUpdateItem, handleAssign, handleDelete,
        handleMoveItem, handleCreateDay, handleCreateMeal, handleCreatePerson,
        handleCreateDayWithMeals,
        handleUpdateDay, handleDeleteDay, handleUpdateMealTitle, handleDeleteMeal,
        handleUpdatePerson, handleDeletePerson, handleDeleteEvent, findItem
    };
}
