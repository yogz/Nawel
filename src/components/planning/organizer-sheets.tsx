"use client";

import { BottomSheet } from "../ui/bottom-sheet";
import { ShareModal } from "@/features/events/components/share-modal";
import { ItemForm } from "@/features/items/components/item-form";
import { ServiceForm } from "@/features/services/components/service-form";
import { MealForm } from "@/features/meals/components/meal-form";
import { ServiceEditForm } from "@/features/services/components/service-edit-form";
import { PersonForm } from "@/features/people/components/person-form";
import { PersonEditForm } from "@/features/people/components/person-edit-form";
import { PersonSelectSheet } from "./person-select-sheet";
import { ShoppingListSheet } from "./shopping-list-sheet";
import { useSearchParams } from "next/navigation";
import { GuestAccessSheet } from "@/features/auth/components/guest-access-sheet";

import {
  type PlanData,
  type OrganizerHandlers,
  type Sheet,
  type PlanningFilter,
} from "@/lib/types";

interface OrganizerSheetsProps {
  sheet: Sheet | null;
  setSheet: (sheet: Sheet | null) => void;
  plan: PlanData;
  slug: string;
  writeKey?: string;
  readOnly?: boolean;
  handlers: OrganizerHandlers;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setSuccessMessage: (msg: { text: string; type: "success" | "error" } | null) => void;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  currentUserId?: string;
  onAuth: () => void;
  onDismissGuestPrompt: () => void;
}

export function OrganizerSheets({
  sheet,
  setSheet,
  plan,
  slug,
  writeKey,
  readOnly,
  handlers,
  isGenerating,
  setIsGenerating,
  setSuccessMessage,
  planningFilter,
  setPlanningFilter,
  currentUserId,
  onAuth,
  onDismissGuestPrompt,
}: OrganizerSheetsProps) {
  const searchParams = useSearchParams();

  // Helper to find item needed for ItemForm
  const findItem = handlers.findItem;

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
    // Ingredient handlers
    handleGenerateIngredients,
    handleToggleIngredient,
    handleDeleteIngredient,
    handleCreateIngredient,
    handleDeleteAllIngredients,
  } = handlers;

  const getTitle = () => {
    if (sheet?.type === "item") {
      return sheet.item ? "Modifier l'article" : "Ajouter un article";
    }
    if (sheet?.type === "service") {
      return "Ajouter un service";
    }
    if (sheet?.type === "service-edit") {
      return "Modifier le service";
    }
    if (sheet?.type === "meal-edit") {
      return "Modifier le repas";
    }
    if (sheet?.type === "person") {
      return "Ajouter un convive";
    }
    if (sheet?.type === "person-edit") {
      return "Modifier le convive";
    }
    if (sheet?.type === "person-select") {
      return "Filtrer par personne";
    }
    if (sheet?.type === "share") {
      return "Partager l'accès";
    }
    if (sheet?.type === "shopping-list") {
      return `Liste de courses`;
    }
    if (sheet?.type === "guest-access") {
      return "Accès invité";
    }
    return "";
  };

  return (
    <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={getTitle()}>
      {sheet?.type === "item" && (
        <ItemForm
          people={plan.people}
          defaultItem={(() => {
            if (sheet.item) {
              const found = findItem(sheet.item.id);
              return found?.item || sheet.item;
            }
            return undefined;
          })()}
          allServices={plan.meals.flatMap((m) =>
            m.services.map((s) => ({ ...s, mealTitle: m.title || m.date }))
          )}
          currentServiceId={sheet.serviceId || sheet.item?.serviceId}
          servicePeopleCount={(() => {
            const serviceId = sheet.serviceId || sheet.item?.serviceId;
            if (!serviceId) {
              return undefined;
            }
            for (const meal of plan.meals) {
              const service = meal.services.find((s) => s.id === serviceId);
              if (service) {
                return service.peopleCount;
              }
            }
            return undefined;
          })()}
          onSubmit={(vals) =>
            sheet.item
              ? handleUpdateItem(sheet.item.id, vals)
              : handleCreateItem({ ...vals, serviceId: sheet.serviceId })
          }
          onAssign={(pId) => sheet.item && handleAssign(sheet.item, pId)}
          onMoveService={(sId) => sheet.item && handleMoveItem(sheet.item.id, sId)}
          onDelete={sheet.item ? () => handleDelete(sheet.item!) : undefined}
          readOnly={readOnly}
          // Ingredient props
          ingredients={(() => {
            if (sheet.item) {
              const found = findItem(sheet.item.id);
              return found?.item.ingredients || sheet.item.ingredients;
            }
            return undefined;
          })()}
          onGenerateIngredients={
            sheet.item
              ? async (currentName: string, currentNote?: string) => {
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
                      (() => {
                        const sId = sheet.serviceId || sheet.item?.serviceId;
                        const s = plan.meals.flatMap((m) => m.services).find((s) => s.id === sId);
                        return s?.adults;
                      })(),
                      (() => {
                        const sId = sheet.serviceId || sheet.item?.serviceId;
                        const s = plan.meals.flatMap((m) => m.services).find((s) => s.id === sId);
                        return s?.children;
                      })(),
                      peopleCount ||
                        (() => {
                          const sId = sheet.serviceId || sheet.item?.serviceId;
                          const s = plan.meals.flatMap((m) => m.services).find((s) => s.id === sId);
                          return s?.peopleCount;
                        })()
                    );
                    setSuccessMessage({ text: "Ingrédients générés ! ✨", type: "success" });
                  } catch (error) {
                    console.error("Failed to generate ingredients:", error);
                    setSuccessMessage({ text: "Erreur de génération ❌", type: "error" });
                  } finally {
                    setIsGenerating(false);
                  }
                }
              : undefined
          }
          onToggleIngredient={
            sheet.item
              ? (id: number, checked: boolean) =>
                  handleToggleIngredient(id, sheet.item!.id, checked)
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
          isGenerating={isGenerating}
        />
      )}

      {sheet?.type === "service" && (
        <ServiceForm
          meals={plan.meals}
          defaultMealId={sheet.mealId}
          defaultAdults={plan.event?.adults || 0}
          defaultChildren={plan.event?.children || 0}
          defaultPeopleCount={(plan.event?.adults || 0) + (plan.event?.children || 0)}
          forceNewMeal={sheet.mealId === -1}
          readOnly={readOnly}
          onSubmit={async (
            mealId: number,
            title: string,
            adults: number,
            children: number,
            peopleCount: number,
            newMealDate?: string,
            newMealTitle?: string
          ) => {
            let targetMealId = mealId;
            if (mealId === -1 && newMealDate) {
              targetMealId = await handleCreateMeal(newMealDate, newMealTitle || undefined);
            }
            handleCreateService(targetMealId, title, adults, children, peopleCount);
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
          onSubmit={(
            date: string,
            title?: string,
            _servs?: string[],
            adults?: number,
            children?: number
          ) => handleUpdateMeal(sheet.meal.id, date, title, adults, children)}
          onDelete={handleDeleteMeal}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === "meal-create" && (
        <MealForm
          defaultAdults={plan.event?.adults || 0}
          defaultChildren={plan.event?.children || 0}
          onSubmit={(
            date: string,
            title?: string,
            services?: string[],
            adults?: number,
            children?: number
          ) => handleCreateMealWithServices(date, title, services, adults, children)}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet?.type === "person" && (
        <PersonForm
          readOnly={readOnly}
          onSubmit={handleCreatePerson}
          currentUserId={currentUserId}
        />
      )}

      {sheet?.type === "person-edit" && (
        <PersonEditForm
          person={sheet.person}
          allPeople={plan.people}
          readOnly={readOnly}
          onSubmit={(name: string, emoji?: string | null) =>
            handleUpdatePerson(sheet.person.id, name, emoji ?? undefined)
          }
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

      {sheet?.type === "guest-access" && (
        <GuestAccessSheet
          open={true}
          onClose={() => {
            setSheet(null);
            onDismissGuestPrompt();
          }}
          onAuth={onAuth}
        />
      )}

      {sheet?.type === "shopping-list" && (
        <ShoppingListSheet
          person={sheet.person}
          plan={plan}
          slug={slug}
          writeKey={writeKey}
          onToggleIngredient={handleToggleIngredient}
          onToggleItemChecked={handlers.handleToggleItemChecked}
        />
      )}
    </BottomSheet>
  );
}
