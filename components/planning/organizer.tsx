"use client";

import { useEffect } from "react";
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
import { MealForm } from "../forms/meal-form";
import { PersonForm } from "../forms/person-form";
import { PersonEditForm } from "../forms/person-edit-form";
import { PlanningTab } from "./planning-tab";
import { PeopleTab } from "./people-tab";
import { SettingsTab } from "./settings-tab";

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";
import { useEventHandlers } from "@/hooks/use-event-handlers";

import { DayForm } from "../forms/day-form";
import { MealEditForm } from "../forms/meal-edit-form";

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
    handleCreateDay,
    handleCreateMeal,
    handleUpdateDay,
    handleDeleteDay,
    handleUpdateMealTitle,
    handleDeleteMeal,
    handleCreatePerson,
    handleCreateDayWithMeals,
    handleUpdatePerson,
    handleDeletePerson,
    handleDeleteEvent,
    findItem,
  } = handlers;

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

              if (typeof over.id === "string" && over.id.startsWith("meal-")) {
                handleMoveItem(itemId, Number(over.id.replace("meal-", "")));
              } else if (typeof over.id === "number") {
                const targetItem = findItem(over.id);
                if (targetItem && targetItem.meal.id !== found.meal.id) {
                  const targetIndex = targetItem.meal.items.findIndex((i: any) => i.id === over.id);
                  handleMoveItem(itemId, targetItem.meal.id, targetIndex);
                }
              }
            }}
            onAssign={(item: Item, mealId: number) => setSheet({ type: "item", mealId, item })}
            onDelete={handleDelete}
            onCreateItem={(mealId: number) => setSheet({ type: "item", mealId })}
            onCreateMeal={() => setSheet({ type: "meal", dayId: plan.days[0]?.id ?? -1 })}
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
            sheet?.type === "meal" ? "Ajouter un service" :
              sheet?.type === "meal-edit" ? "Modifier le service" :
                sheet?.type === "day-edit" ? "Modifier le repas" :
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
            allMeals={plan.days.flatMap((d: any) => d.meals.map((m: any) => ({ ...m, dayTitle: d.title || d.date })))}
            currentMealId={sheet.mealId || sheet.item?.mealId}
            onSubmit={(vals) =>
              sheet.item ? handleUpdateItem(sheet.item.id, vals) : handleCreateItem({ ...vals, mealId: sheet.mealId })
            }
            onAssign={(pId) => sheet.item && handleAssign(sheet.item, pId)}
            onMoveMeal={(mId) => sheet.item && handleMoveItem(sheet.item.id, mId)}
            onDelete={sheet.item ? () => handleDelete(sheet.item!) : undefined}
            readOnly={readOnly}
          />
        )}

        {sheet?.type === "meal" && (
          <MealForm
            days={plan.days}
            defaultDayId={sheet.dayId}
            forceNewDay={sheet.dayId === -1}
            readOnly={readOnly}
            onSubmit={async (dayId, title, newDayDate, newDayTitle) => {
              let targetDayId = dayId;
              if (dayId === -1 && newDayDate) {
                targetDayId = await handleCreateDay(newDayDate, newDayTitle);
              }
              handleCreateMeal(targetDayId, title);
            }}
          />
        )}
        {sheet?.type === "meal-edit" && (
          <MealEditForm
            meal={sheet.meal}
            onSubmit={handleUpdateMealTitle}
            onDelete={handleDeleteMeal}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === "day-edit" && (
          <DayForm
            day={sheet.day}
            onSubmit={(date: string, title?: string) => handleUpdateDay(sheet.day.id, date, title)}
            onDelete={handleDeleteDay}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === "day-create" && (
          <DayForm
            onSubmit={handleCreateDayWithMeals}
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
