"use client";

import { useMemo, useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { X } from "lucide-react";
import { ShareModal } from "@/features/events/components/share-modal";
import { ItemForm } from "@/features/items/components/item-form";
import { ServiceForm } from "@/features/services/components/service-form";
import { MealForm } from "@/features/meals/components/meal-form";
import { ServiceEditForm } from "@/features/services/components/service-edit-form";
import { PersonForm } from "@/features/people/components/person-form";
import { PersonEditForm } from "@/features/people/components/person-edit-form";
import { ShoppingListSheet } from "./shopping-list-sheet";
import { useSearchParams, useParams } from "next/navigation";
import { GuestAccessSheet } from "@/features/auth/components/guest-access-sheet";
import { ClaimPersonSheet } from "@/features/auth/components/claim-person-sheet";

import {
  type PlanData,
  type OrganizerHandlers,
  type Sheet,
  type PlanningFilter,
} from "@/lib/types";
import { useTranslations } from "next-intl";

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
  successMessage: { text: string; type?: "success" | "error" } | null;
  setSuccessMessage: (msg: { text: string; type?: "success" | "error" } | null) => void;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  currentUserId?: string;
  currentUserImage?: string | null;
  onAuth: () => void;
  onDismissGuestPrompt: () => void;
  onJoinNew: () => void;
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
  successMessage,
  setSuccessMessage,
  planningFilter,
  setPlanningFilter,
  currentUserId,
  currentUserImage,
  onAuth,
  onDismissGuestPrompt,
  onJoinNew,
}: OrganizerSheetsProps) {
  const tCommon = useTranslations("EventDashboard.Shared");
  const t = useTranslations("EventDashboard.Sheets");
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;

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
    handleUnclaimPerson,
    // Ingredient handlers
    handleGenerateIngredients,
    handleToggleIngredient,
    handleDeleteIngredient,
    handleCreateIngredient,
    handleDeleteAllIngredients,
  } = handlers;

  // Memoized computed values to avoid recalculating on every render
  const defaultItem = useMemo(() => {
    if (sheet?.type !== "item" || !sheet.item) {
      return undefined;
    }
    const found = findItem(sheet.item.id);
    return found?.item || sheet.item;
  }, [sheet, findItem]);

  const allServices = useMemo(() => {
    return plan.meals.flatMap((m) =>
      m.services.map((s) => ({ ...s, mealTitle: m.title || m.date }))
    );
  }, [plan.meals]);

  const currentServiceId = useMemo(() => {
    if (sheet?.type !== "item") {
      return undefined;
    }
    return sheet.serviceId || sheet.item?.serviceId;
  }, [sheet]);

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
    if (sheet?.type !== "item" || !sheet.item) {
      return undefined;
    }
    const found = findItem(sheet.item.id);
    return found?.item.ingredients || sheet.item.ingredients;
  }, [sheet, findItem]);

  // Calculate default service values from the selected meal
  const serviceDefaults = useMemo(() => {
    if (sheet?.type !== "service") {
      return { adults: 0, children: 0, peopleCount: 0 };
    }
    if (sheet.mealId === -1) {
      // New meal: use event defaults
      return {
        adults: plan.event?.adults ?? 0,
        children: plan.event?.children ?? 0,
        peopleCount: (plan.event?.adults ?? 0) + (plan.event?.children ?? 0),
      };
    }
    // Existing meal: use meal values
    const meal = plan.meals.find((m) => m.id === sheet.mealId);
    if (meal) {
      return {
        adults: meal.adults,
        children: meal.children,
        peopleCount: meal.adults + meal.children,
      };
    }
    // Fallback to event values if meal not found
    return {
      adults: plan.event?.adults ?? 0,
      children: plan.event?.children ?? 0,
      peopleCount: (plan.event?.adults ?? 0) + (plan.event?.children ?? 0),
    };
  }, [sheet, plan.meals, plan.event]);

  // Calculate default meal values from event and last meal
  const mealDefaults = useMemo(() => {
    if (sheet?.type !== "meal-create") {
      return { adults: 0, children: 0, date: undefined, address: undefined };
    }
    // Get the last meal's address if available
    const lastMeal = plan.meals.length > 0 ? plan.meals[plan.meals.length - 1] : null;
    // Use today's date as default
    const today = new Date().toISOString().split("T")[0];
    return {
      adults: plan.event?.adults ?? 0,
      children: plan.event?.children ?? 0,
      date: today,
      address: lastMeal?.address || undefined,
    };
  }, [sheet, plan.meals, plan.event]);

  const getTitle = () => {
    if (sheet?.type === "item") {
      return sheet.item ? t("editItem") : t("addItem");
    }
    if (sheet?.type === "service") {
      return t("addService");
    }
    if (sheet?.type === "service-edit") {
      return t("editService");
    }
    if (sheet?.type === "meal-edit") {
      return t("editMeal");
    }
    if (sheet?.type === "person") {
      return t("addGuest");
    }
    if (sheet?.type === "person-edit") {
      return t("editGuest");
    }
    if (sheet?.type === "share") {
      return t("shareAccess");
    }
    if (sheet?.type === "shopping-list") {
      return t("shoppingList");
    }
    if (sheet?.type === "guest-access") {
      return t("guestAccess");
    }
    if (sheet?.type === "claim-person") {
      return t("claimPerson");
    }
    return "";
  };

  return (
    <Drawer open={!!sheet} onOpenChange={(open) => !open && setSheet(null)}>
      <DrawerContent className="px-4 sm:px-6">
        {sheet?.type !== "share" && (
          <DrawerHeader className="px-0 pb-3 text-left sm:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DrawerTitle className="text-lg sm:text-xl">{getTitle()}</DrawerTitle>
              </div>
              <DrawerClose asChild>
                <button
                  className="touch-manipulation rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95"
                  aria-label={tCommon("close") || "Fermer"}
                >
                  <X size={18} />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>
        )}
        <div className="scrollbar-none min-h-[60vh] flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-8 sm:pb-20">
          {sheet?.type === "item" && (
            <ItemForm
              people={plan.people}
              defaultItem={defaultItem}
              allServices={allServices}
              currentServiceId={currentServiceId}
              servicePeopleCount={servicePeopleCount}
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
              ingredients={itemIngredients}
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
                            const s = plan.meals
                              .flatMap((m) => m.services)
                              .find((s) => s.id === sId);
                            return s?.adults;
                          })(),
                          (() => {
                            const sId = sheet.serviceId || sheet.item?.serviceId;
                            const s = plan.meals
                              .flatMap((m) => m.services)
                              .find((s) => s.id === sId);
                            return s?.children;
                          })(),
                          peopleCount ||
                            (() => {
                              const sId = sheet.serviceId || sheet.item?.serviceId;
                              const s = plan.meals
                                .flatMap((m) => m.services)
                                .find((s) => s.id === sId);
                              return s?.peopleCount;
                            })(),
                          locale
                        );
                        setSuccessMessage({ text: t("ingredientsGenerated"), type: "success" });
                      } catch (error) {
                        console.error("Failed to generate ingredients:", error);
                        setSuccessMessage({ text: t("generationError"), type: "error" });
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
                  ? (name: string, qty?: string) =>
                      handleCreateIngredient(sheet.item!.id, name, qty)
                  : undefined
              }
              onDeleteAllIngredients={
                sheet.item ? () => handleDeleteAllIngredients(sheet.item!.id) : undefined
              }
              isGenerating={isGenerating}
              isAuthenticated={!!currentUserId}
              onRequestAuth={onAuth}
              currentUserId={currentUserId}
            />
          )}

          {sheet?.type === "service" && (
            <ServiceForm
              meals={plan.meals}
              defaultMealId={sheet.mealId}
              defaultAdults={serviceDefaults.adults}
              defaultChildren={serviceDefaults.children}
              defaultPeopleCount={serviceDefaults.peopleCount}
              forceNewMeal={sheet.mealId === -1}
              readOnly={readOnly}
              onSubmit={async (
                mealId: number,
                title: string,
                adults: number,
                children: number,
                peopleCount: number,
                newMealDate?: string,
                newMealTitle?: string,
                newMealTime?: string,
                newMealAddress?: string
              ) => {
                let targetMealId = mealId;
                if (mealId === -1 && newMealDate) {
                  targetMealId = await handleCreateMeal(
                    newMealDate,
                    newMealTitle || undefined,
                    undefined,
                    undefined,
                    newMealTime,
                    newMealAddress
                  );
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
                children?: number,
                time?: string,
                address?: string
              ) => handleUpdateMeal(sheet.meal.id, date, title, adults, children, time, address)}
              onDelete={handleDeleteMeal}
              onClose={() => setSheet(null)}
            />
          )}
          {sheet?.type === "meal-create" && (
            <MealForm
              defaultAdults={mealDefaults.adults}
              defaultChildren={mealDefaults.children}
              defaultDate={mealDefaults.date}
              defaultAddress={mealDefaults.address}
              onSubmit={(
                date: string,
                title?: string,
                services?: string[],
                adults?: number,
                children?: number,
                time?: string,
                address?: string
              ) =>
                handleCreateMealWithServices(date, title, services, adults, children, time, address)
              }
              onClose={() => setSheet(null)}
            />
          )}

          {sheet?.type === "person" && (
            <PersonForm
              readOnly={readOnly}
              onSubmit={handleCreatePerson}
              currentUserId={currentUserId}
              currentUserImage={currentUserImage}
            />
          )}

          {sheet?.type === "person-edit" && (
            <PersonEditForm
              person={sheet.person}
              allPeople={plan.people}
              readOnly={readOnly}
              onSubmit={(name: string, emoji: string | null, image?: string | null) =>
                handleUpdatePerson(sheet.person.id, name, emoji, image)
              }
              onDelete={() => handleDeletePerson(sheet.person.id)}
              currentUserId={currentUserId}
            />
          )}

          {sheet?.type === "share" && (
            <ShareModal
              slug={slug}
              adminKey={writeKey}
              onClose={() => setSheet(null)}
              isNew={searchParams.get("new") === "true"}
              eventName={plan.event?.name}
            />
          )}

          {sheet?.type === "guest-access" && (
            <GuestAccessSheet
              open
              onClose={() => {
                setSheet(null);
                onDismissGuestPrompt();
              }}
              onAuth={onAuth}
            />
          )}

          {sheet?.type === "claim-person" && (
            <ClaimPersonSheet
              open
              unclaimed={sheet.unclaimed}
              onClose={() => setSheet(null)}
              onClaim={async (id) => {
                try {
                  await handlers.handleClaimPerson(id);
                  setSheet(null);
                } catch (error) {
                  // Error is handled in the handler (toast/console)
                }
              }}
              onJoinNew={onJoinNew}
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
