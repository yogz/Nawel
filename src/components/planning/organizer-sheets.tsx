"use client";

import { useMemo, useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { X, Check } from "lucide-react";
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

  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (
      successMessage?.text?.includes("Modifications") ||
      successMessage?.text?.includes("mis à jour") ||
      successMessage?.text?.includes("enregistrées")
    ) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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
      <DrawerContent className="px-6">
        {sheet?.type !== "share" && (
          <DrawerHeader className="px-0 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DrawerTitle>{getTitle()}</DrawerTitle>
                {showSaved && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-green-500 duration-300 animate-in fade-in slide-in-from-left-2">
                    <Check size={10} strokeWidth={3} />
                    {tCommon("saved") || "Enregistré"}
                  </span>
                )}
              </div>
              <DrawerClose asChild>
                <button
                  className="rounded-full bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95"
                  aria-label={tCommon("close") || "Fermer"}
                >
                  <X size={16} />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>
        )}
        <div className="scrollbar-none overflow-y-auto pb-8">
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
              defaultAdults={plan.event?.adults || 0}
              defaultChildren={plan.event?.children || 0}
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
