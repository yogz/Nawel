"use client";

import { useTransition } from "react";
import confetti from "canvas-confetti";
import {
    createItemAction, updateItemAction, deleteItemAction, assignItemAction,
    createMealAction, updateMealAction, deleteMealAction, createMealWithServicesAction,
    createServiceAction, updateServiceAction, deleteServiceAction,
    createPersonAction, updatePersonAction,
    deletePersonAction, moveItemAction, deleteEventAction,
    generateIngredientsAction, createIngredientAction, updateIngredientAction,
    deleteIngredientAction, deleteAllIngredientsAction
} from "@/app/actions";
import { PlanData, Item, Service, Person } from "@/lib/types";
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

    const setServiceItems = (serviceId: number, updater: (items: Item[]) => Item[]) => {
        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.map((meal) => ({
                ...meal,
                services: meal.services.map((service) => (service.id === serviceId ? { ...service, items: updater(service.items) } : service)),
            })),
        }));
    };

    const handleCreateItem = (data: { serviceId: number; name: string; quantity?: string; note?: string; price?: number }) => {
        if (readOnly) return;
        startTransition(async () => {
            const created = await createItemAction({ ...data, slug, key: writeKey });
            setServiceItems(data.serviceId, (items) => [...items, { ...created, person: null }]);
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
            setServiceItems(found.service.id, (items) => items.map((it) => (it.id === itemId ? updatedItem : it)));
            if (closeSheet) setSheet(null);
        });
    };

    const handleAssign = (item: Item, personId: number | null) => {
        if (readOnly) return;

        setServiceItems(item.serviceId, (items) =>
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
        setServiceItems(item.serviceId, (items) => items.filter((i) => i.id !== item.id));
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

    const findItem = (itemId: number): { item: Item; service: Service; mealId: number } | null => {
        for (const meal of plan.meals) {
            for (const service of meal.services) {
                const item = (service.items as Item[]).find((i: Item) => i.id === itemId);
                if (item) return { item, service, mealId: meal.id };
            }
        }
        return null;
    };

    const handleMoveItem = (itemId: number, targetServiceId: number, targetOrder?: number) => {
        if (readOnly) return;
        const found = findItem(itemId);
        if (!found) return;

        const { item, service: sourceService } = found;
        if (sourceService.id === targetServiceId) return;

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

    const handleCreateMeal = async (date: string, title?: string): Promise<number> => {
        if (readOnly) return 0;
        try {
            const created = await createMealAction({ date, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                meals: [...prev.meals, { ...created, services: [] }].sort((a, b) => a.date.localeCompare(b.date)),
            }));
            return created.id;
        } catch (error) {
            console.error("Failed to create meal:", error);
            alert("Erreur lors de la création du repas. Vérifiez les logs console.");
            return 0;
        }
    };

    const handleCreateMealWithServices = (date: string, title: string | undefined, services: string[]) => {
        if (readOnly) return;
        startTransition(async () => {
            try {
                const created = await createMealWithServicesAction({ date, title, services, slug, key: writeKey });
                setPlan((prev: PlanData) => ({
                    ...prev,
                    meals: [...prev.meals, created].sort((a, b) => a.date.localeCompare(b.date)),
                }));
                setSheet(null);
                setSuccessMessage("Nouveau repas créé avec succès ✨");
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (error) {
                console.error("Failed to create meal with services:", error);
                alert("Erreur lors de la création du repas avec services.");
            }
        });
    };

    const handleCreateService = (mealId: number, title: string, peopleCount?: number) => {
        if (readOnly) return;
        startTransition(async () => {
            const created = await createServiceAction({ mealId, title, peopleCount, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                meals: prev.meals.map((m) => (m.id === mealId ? { ...m, services: [...m.services, { ...created, items: [] }] } : m)),
            }));
            setSheet(null);
        });
    };

    const handleUpdateService = (id: number, title?: string, peopleCount?: number) => {
        if (readOnly) return;
        startTransition(async () => {
            await updateServiceAction({ id, title, peopleCount, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                meals: prev.meals.map((m) => ({
                    ...m,
                    services: m.services.map((s) => (s.id === id ? { ...s, ...(title !== undefined && { title }), ...(peopleCount !== undefined && { peopleCount }) } : s)),
                })),
            }));
            setSheet(null);
        });
    };

    const handleDeleteService = (id: number) => {
        if (readOnly) return;
        if (!confirm("Supprimer ce service et tous ses articles ?")) return;
        const previousPlan = plan;
        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.map((m) => ({
                ...m,
                services: m.services.filter((s) => s.id !== id),
            })),
        }));
        setSheet(null);
        startTransition(async () => {
            try {
                await deleteServiceAction({ id, slug, key: writeKey });
            } catch (error) {
                console.error("Failed to delete service:", error);
                setPlan(previousPlan);
                alert("Erreur lors de la suppression du service.");
            }
        });
    };

    const handleUpdateMeal = (id: number, date: string, title?: string | null) => {
        if (readOnly) return;
        startTransition(async () => {
            await updateMealAction({ id, date, title, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
                ...prev,
                meals: prev.meals.map((m) => (m.id === id ? { ...m, date, title: title ?? null } : m)),
            }));
            setSheet(null);
        });
    };

    const handleDeleteMeal = (id: number) => {
        if (readOnly) return;
        if (!confirm("Supprimer ce repas et tous ses services ?")) return;
        const previousPlan = plan;
        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.filter((m) => m.id !== id),
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
            meals: prev.meals.map((meal) => ({
                ...meal,
                services: meal.services.map((service) => ({
                    ...service,
                    items: service.items.map((item) => (item.personId === id ? { ...item, personId: null, person: null } : item)),
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

    // Ingredient handlers
    const handleGenerateIngredients = async (itemId: number, itemName: string, peopleCount?: number) => {
        if (readOnly) return [];
        try {
            const generated = await generateIngredientsAction({
                itemId,
                itemName,
                peopleCount,
                slug,
                key: writeKey,
            });

            // Update local state
            setPlan((prev: PlanData) => ({
                ...prev,
                meals: prev.meals.map((meal) => ({
                    ...meal,
                    services: meal.services.map((service) => ({
                        ...service,
                        items: service.items.map((item) =>
                            item.id === itemId
                                ? { ...item, ingredients: generated }
                                : item
                        ),
                    })),
                })),
            }));

            return generated;
        } catch (error) {
            console.error("Failed to generate ingredients:", error);
            throw error;
        }
    };

    const handleToggleIngredient = (ingredientId: number, itemId: number, checked: boolean) => {
        if (readOnly) return;

        // Optimistic update
        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.map((meal) => ({
                ...meal,
                services: meal.services.map((service) => ({
                    ...service,
                    items: service.items.map((item) =>
                        item.id === itemId
                            ? {
                                ...item,
                                ingredients: item.ingredients?.map((ing) =>
                                    ing.id === ingredientId ? { ...ing, checked } : ing
                                ),
                            }
                            : item
                    ),
                })),
            })),
        }));

        startTransition(async () => {
            await updateIngredientAction({
                id: ingredientId,
                checked,
                slug,
                key: writeKey,
            });
        });
    };

    const handleDeleteIngredient = (ingredientId: number, itemId: number) => {
        if (readOnly) return;

        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.map((meal) => ({
                ...meal,
                services: meal.services.map((service) => ({
                    ...service,
                    items: service.items.map((item) =>
                        item.id === itemId
                            ? {
                                ...item,
                                ingredients: item.ingredients?.filter((ing) => ing.id !== ingredientId),
                            }
                            : item
                    ),
                })),
            })),
        }));

        startTransition(async () => {
            await deleteIngredientAction({ id: ingredientId, slug, key: writeKey });
        });
    };

    const handleCreateIngredient = (itemId: number, name: string, quantity?: string) => {
        if (readOnly) return;

        startTransition(async () => {
            const created = await createIngredientAction({
                itemId,
                name,
                quantity,
                slug,
                key: writeKey,
            });

            setPlan((prev: PlanData) => ({
                ...prev,
                meals: prev.meals.map((meal) => ({
                    ...meal,
                    services: meal.services.map((service) => ({
                        ...service,
                        items: service.items.map((item) =>
                            item.id === itemId
                                ? { ...item, ingredients: [...(item.ingredients || []), created] }
                                : item
                        ),
                    })),
                })),
            }));
        });
    };

    const handleDeleteAllIngredients = (itemId: number) => {
        if (readOnly) return;
        if (!confirm("Supprimer tous les ingrédients ?")) return;

        setPlan((prev: PlanData) => ({
            ...prev,
            meals: prev.meals.map((meal) => ({
                ...meal,
                services: meal.services.map((service) => ({
                    ...service,
                    items: service.items.map((item) =>
                        item.id === itemId ? { ...item, ingredients: [] } : item
                    ),
                })),
            })),
        }));

        startTransition(async () => {
            await deleteAllIngredientsAction({ itemId, slug, key: writeKey });
        });
    };

    return {
        handleCreateItem, handleUpdateItem, handleAssign, handleDelete,
        handleMoveItem, handleCreateMeal, handleCreateService, handleCreatePerson,
        handleCreateMealWithServices,
        handleUpdateMeal, handleDeleteMeal, handleUpdateService, handleDeleteService,
        handleUpdatePerson, handleDeletePerson, handleDeleteEvent, findItem,
        // Ingredient handlers
        handleGenerateIngredients, handleToggleIngredient, handleDeleteIngredient,
        handleCreateIngredient, handleDeleteAllIngredients
    };
}
