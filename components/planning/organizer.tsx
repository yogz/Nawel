"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { PlanData, Item } from "@/lib/types";
import { TabBar } from "../tab-bar";
import { BottomSheet } from "../ui/bottom-sheet";
import { useThemeMode } from "../theme-provider";
import { validateWriteKeyAction, getChangeLogsAction } from "@/app/actions";

// Extracted Components
import { OrganizerHeader } from "./organizer-header";
import { PersonSelectSheet } from "./person-select-sheet";
import { SuccessToast } from "../common/success-toast";
import { ShareModal } from "../modals/share-modal";
import { ItemForm } from "../forms/item-form";
import { ServiceForm } from "../forms/service-form";
import { PersonForm } from "../forms/person-form";
import { PersonEditForm } from "../forms/person-edit-form";
import { PlanningTab } from "./planning-tab";
import { PeopleTab } from "./people-tab";
import { SettingsTab } from "./settings-tab";

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";
import { useEventHandlers } from "@/hooks/use-event-handlers";

import { MealForm } from "../forms/meal-form";
import { ServiceEditForm } from "../forms/service-edit-form";

export function Organizer({
  initialPlan,
  slug,
  writeKey,
  writeEnabled: initialWriteEnabled,
}: {
  initialPlan: PlanData;
  slug: string;
  writeKey?: string;
  writeEnabled: boolean;
}) {
  const {
    plan,
    setPlan,
    tab,
    setTab,
    logs,
    setLogs,
    planningFilter,
    setPlanningFilter,
    sheet,
    setSheet,
    selectedPerson,
    setSelectedPerson,
    readOnly,
    setReadOnly,
    startTransition,
    activeItemId,
    setActiveItemId,
    successMessage,
    setSuccessMessage,
    logsLoading,
    setLogsLoading,
    unassignedItemsCount,
  } = useEventState(initialPlan, initialWriteEnabled);

  const handlers = useEventHandlers({
    plan,
    setPlan,
    slug,
    writeKey,
    readOnly,
    setSheet,
    setSelectedPerson,
    setSuccessMessage,
  });

  const {
    handleCreateItem,
    handleUpdateItem,
    handleAssign,
    handleDelete,
    handleMoveItem,
    handleCreateMeal,
    handleCreateService,
    handleUpdateMeal,
    handleDeleteMeal,
    handleUpdateService,
    handleDeleteService,
    handleCreatePerson,
    handleCreateMealWithServices,
    handleUpdatePerson,
    handleDeletePerson,
    handleDeleteEvent,
    findItem,
    // Ingredient handlers
    handleGenerateIngredients,
    handleToggleIngredient,
    handleDeleteIngredient,
    handleCreateIngredient,
    handleDeleteAllIngredients,
  } = handlers;

  // State for ingredient generation
  const [isGenerating, setIsGenerating] = useState(false);

  const { christmas, toggle: toggleChristmas } = useThemeMode();
  const searchParams = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setSheet({ type: "share" });
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ea580c", "#ef4444", "#fbbf24", "#ffffff"],
      });
    }
  }, [searchParams, setSheet]);

  useEffect(() => {
    validateWriteKeyAction({ key: writeKey, slug }).then((ok) => setReadOnly(!ok));
  }, [writeKey, slug, setReadOnly]);

  useEffect(() => {
    if (tab === "settings") {
      setLogsLoading(true);
      getChangeLogsAction({ slug })
        .then(setLogs)
        .finally(() => setLogsLoading(false));
    }
  }, [tab, slug, setLogs, setLogsLoading]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col pb-24">
      <OrganizerHeader
        christmas={christmas}
        readOnly={readOnly}
        tab={tab}
        plan={plan}
        planningFilter={planningFilter}
        setPlanningFilter={setPlanningFilter}
        setSheet={setSheet}
        sheet={sheet}
        unassignedItemsCount={unassignedItemsCount}
      />

      <SuccessToast message={successMessage} christmas={christmas} />

      <main className="flex-1 space-y-4 px-4 py-8">
        {tab === "planning" && (
          <PlanningTab
            plan={plan}
            planningFilter={planningFilter}
            activeItemId={activeItemId}
            readOnly={readOnly}
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveItemId(Number(e.active.id))}
            onDragEnd={(e: DragEndEvent) => {
              setActiveItemId(null);
              const { active, over } = e;
              if (!over || !active.id) return;
              const itemId = Number(active.id);
              const found = findItem(itemId);
              if (!found) return;

              if (typeof over.id === "string" && over.id.startsWith("service-")) {
                handleMoveItem(itemId, Number(over.id.replace("service-", "")));
              } else if (typeof over.id === "number") {
                const targetItem = findItem(over.id);
                if (targetItem && targetItem.service.id !== found.service.id) {
                  const targetIndex = targetItem.service.items.findIndex((i: any) => i.id === over.id);
                  handleMoveItem(itemId, targetItem.service.id, targetIndex);
                }
              }
            }}
            onAssign={(item: Item, serviceId: number) => setSheet({ type: "item", serviceId, item })}
            onDelete={handleDelete}
            onCreateItem={(serviceId: number) => setSheet({ type: "item", serviceId })}
            onCreateService={() => setSheet({ type: "service", mealId: plan.meals[0]?.id ?? -1 })}
            setSheet={setSheet}
          />
        )}

        {tab === "people" && (
          <PeopleTab
            plan={plan}
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            setSheet={setSheet}
            readOnly={readOnly}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            logsLoading={logsLoading}
            logs={logs}
            onDeleteEvent={handleDeleteEvent}
            readOnly={readOnly}
          />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={
          sheet?.type === "item" ? (sheet.item ? "Modifier l'article" : "Ajouter un article") :
            sheet?.type === "service" ? "Ajouter un service" :
              sheet?.type === "service-edit" ? "Modifier le service" :
                sheet?.type === "meal-edit" ? "Modifier le repas" :
                  sheet?.type === "person" ? "Ajouter un convive" :
                    sheet?.type === "person-edit" ? "Modifier le convive" :
                      sheet?.type === "person-select" ? "Filtrer par personne" :
                        sheet?.type === "share" ? "Partager l'accès" : ""
        }
      >
        {sheet?.type === "item" && (
          <ItemForm
            people={plan.people}
            defaultItem={sheet.item}
            allServices={plan.meals.flatMap((m: any) => m.services.map((s: any) => ({ ...s, mealTitle: m.title || m.date })))}
            currentServiceId={sheet.serviceId || sheet.item?.serviceId}
            servicePeopleCount={(() => {
              const serviceId = sheet.serviceId || sheet.item?.serviceId;
              if (!serviceId) return undefined;
              for (const meal of plan.meals) {
                const service = meal.services.find((s: any) => s.id === serviceId);
                if (service) return (service as any).peopleCount;
              }
              return undefined;
            })()}
            onSubmit={(vals) =>
              sheet.item ? handleUpdateItem(sheet.item.id, vals) : handleCreateItem({ ...vals, serviceId: sheet.serviceId })
            }
            onAssign={(pId) => sheet.item && handleAssign(sheet.item, pId)}
            onMoveService={(sId) => sheet.item && handleMoveItem(sheet.item.id, sId)}
            onDelete={sheet.item ? () => handleDelete(sheet.item!) : undefined}
            readOnly={readOnly}
            // Ingredient props
            ingredients={sheet.item?.ingredients}
            onGenerateIngredients={sheet.item ? async (currentName, currentNote) => {
              setIsGenerating(true);
              try {
                // Try to extract people count from the note (e.g., "Pour 5 personnes")
                let peopleCount = undefined;
                if (currentNote) {
                  const match = currentNote.match(/Pour (\d+) personne/i);
                  if (match) {
                    peopleCount = parseInt(match[1]);
                  }
                }

                await handleGenerateIngredients(
                  sheet.item!.id,
                  currentName || sheet.item!.name,
                  peopleCount || (() => {
                    const serviceId = sheet.serviceId || sheet.item?.serviceId;
                    if (!serviceId) return undefined;
                    for (const meal of plan.meals) {
                      const service = meal.services.find((s: any) => s.id === serviceId);
                      if (service) return (service as any).peopleCount;
                    }
                    return undefined;
                  })()
                );
                setSuccessMessage("Ingredients generes avec succes!");
                setTimeout(() => setSuccessMessage(null), 3000);
              } catch (error) {
                console.error("Failed to generate ingredients:", error);
                alert("Erreur lors de la generation des ingredients. Verifiez votre connexion et reessayez.");
              } finally {
                setIsGenerating(false);
              }
            } : undefined}
            onToggleIngredient={sheet.item ? (id, checked) => handleToggleIngredient(id, sheet.item!.id, checked) : undefined}
            onDeleteIngredient={sheet.item ? (id) => handleDeleteIngredient(id, sheet.item!.id) : undefined}
            onCreateIngredient={sheet.item ? (name, qty) => handleCreateIngredient(sheet.item!.id, name, qty) : undefined}
            onDeleteAllIngredients={sheet.item ? () => handleDeleteAllIngredients(sheet.item!.id) : undefined}
            isGenerating={isGenerating}
          />
        )}

        {sheet?.type === "service" && (
          <ServiceForm
            meals={plan.meals}
            defaultMealId={sheet.mealId}
            forceNewMeal={sheet.mealId === -1}
            readOnly={readOnly}
            onSubmit={async (mealId, title, peopleCount, newMealDate, newMealTitle) => {
              let targetMealId = mealId;
              if (mealId === -1 && newMealDate) {
                targetMealId = await handleCreateMeal(newMealDate, newMealTitle || undefined);
              }
              handleCreateService(targetMealId, title, peopleCount);
            }}
          />
        )}
        {sheet?.type === "service-edit" && (
          <ServiceEditForm
            service={sheet.service}
            onSubmit={handleUpdateService}
            onDelete={handleDeleteService}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === "meal-edit" && (
          <MealForm
            meal={sheet.meal}
            onSubmit={(date: string, title?: string) => handleUpdateMeal(sheet.meal.id, date, title)}
            onDelete={handleDeleteMeal}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === "meal-create" && (
          <MealForm
            onSubmit={handleCreateMealWithServices}
            onClose={() => setSheet(null)}
          />
        )}

        {sheet?.type === "person" && (
          <PersonForm
            readOnly={readOnly}
            onSubmit={handleCreatePerson}
          />
        )}

        {sheet?.type === "person-edit" && (
          <PersonEditForm
            person={sheet.person}
            allPeople={plan.people}
            readOnly={readOnly}
            onSubmit={(name, emoji) => handleUpdatePerson(sheet.person.id, name, emoji)}
            onDelete={() => handleDeletePerson(sheet.person.id)}
          />
        )}

        {sheet?.type === "person-select" && (
          <PersonSelectSheet
            people={plan.people}
            planningFilter={planningFilter}
            setPlanningFilter={setPlanningFilter}
            onClose={() => setSheet(null)}
          />
        )}

        {sheet?.type === "share" && (
          <ShareModal
            slug={slug}
            adminKey={writeKey}
            onClose={() => setSheet(null)}
            isNew={searchParams.get("new") === "true"}
          />
        )}
      </BottomSheet>
    </div>
  );
}
