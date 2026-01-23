"use client";

import { useState, useTransition } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { X } from "lucide-react";
import { ShareModal } from "@/features/events/components/share-modal";
import { EditEventSheet } from "@/features/events/components/edit-event-sheet";
import { ShoppingListSheet } from "./shopping-list-sheet";
import { GuestAccessSheet } from "@/features/auth/components/guest-access-sheet";
import { ClaimPersonSheet } from "@/features/auth/components/claim-person-sheet";
import { useSearchParams, useParams } from "next/navigation";
import { updateEventWithMealAction } from "@/app/actions/event-actions";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import {
  ItemSheetContent,
  ServiceSheetContent,
  ServiceEditSheetContent,
  MealEditSheetContent,
  MealCreateSheetContent,
  PersonSheetContent,
  PersonEditSheetContent,
  IngredientsSheetContent,
} from "./sheets";

import { type PlanData, type OrganizerHandlers, type Sheet } from "@/lib/types";

interface EventPlannerSheetsProps {
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
  currentUserId?: string;
  currentUserImage?: string | null;
  onAuth: () => void;
  onDismissGuestPrompt: () => void;
  onJoinNew: () => void;
}

export function EventPlannerSheets({
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
  currentUserId,
  currentUserImage,
  onAuth,
  onDismissGuestPrompt,
  onJoinNew,
}: EventPlannerSheetsProps) {
  const tCommon = useTranslations("EventDashboard.Shared");
  const t = useTranslations("EventDashboard.Sheets");
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const [isEventPending, startEventTransition] = useTransition();

  const getTitle = () => {
    switch (sheet?.type) {
      case "item":
        return sheet.item ? t("editItem") : t("addItem");
      case "service":
        return t("addService");
      case "service-edit":
        return t("editService");
      case "meal-edit":
        return t("editMeal");
      case "meal-create":
        return t("addMeal");
      case "person": {
        const isJoin = sheet.context === "join";
        return isJoin ? t("claimPerson") : t("addGuest");
      }
      case "person-edit":
        return t("editGuest");
      case "share":
        return t("shareAccess");
      case "shopping-list":
        return t("shoppingList");
      case "guest-access":
        return t("guestAccess");
      case "claim-person":
        return t("claimPerson");
      case "event-edit":
        return t("editEvent");
      default:
        return "";
    }
  };

  const renderSheetContent = () => {
    if (!sheet) {
      return null;
    }

    switch (sheet.type) {
      case "item":
        return (
          <ItemSheetContent
            sheet={sheet}
            setSheet={setSheet}
            plan={plan}
            locale={locale}
            readOnly={readOnly}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            setSuccessMessage={setSuccessMessage}
            currentUserId={currentUserId}
            onAuth={onAuth}
            findItem={handlers.findItem}
            handleUpdateItem={handlers.handleUpdateItem}
            handleCreateItem={handlers.handleCreateItem}
            handleAssign={handlers.handleAssign}
            handleMoveItem={handlers.handleMoveItem}
            handleDelete={handlers.handleDelete}
            handleGenerateIngredients={handlers.handleGenerateIngredients}
            handleToggleIngredient={handlers.handleToggleIngredient}
            handleDeleteIngredient={handlers.handleDeleteIngredient}
            handleCreateIngredient={handlers.handleCreateIngredient}
            handleDeleteAllIngredients={handlers.handleDeleteAllIngredients}
          />
        );

      case "service":
        return (
          <ServiceSheetContent
            sheet={sheet}
            plan={plan}
            readOnly={readOnly}
            handleCreateMeal={handlers.handleCreateMeal}
            handleCreateService={handlers.handleCreateService}
          />
        );

      case "service-edit":
        return (
          <ServiceEditSheetContent
            sheet={sheet}
            setSheet={setSheet}
            handleUpdateService={handlers.handleUpdateService}
            handleDeleteService={handlers.handleDeleteService}
          />
        );

      case "meal-edit":
        return (
          <MealEditSheetContent
            sheet={sheet}
            setSheet={setSheet}
            handleUpdateMeal={handlers.handleUpdateMeal}
            handleDeleteMeal={handlers.handleDeleteMeal}
          />
        );

      case "meal-create":
        return (
          <MealCreateSheetContent
            sheet={sheet}
            setSheet={setSheet}
            plan={plan}
            handleCreateMealWithServices={handlers.handleCreateMealWithServices}
          />
        );

      case "person":
        return (
          <PersonSheetContent
            sheet={sheet}
            readOnly={readOnly}
            currentUserId={currentUserId}
            currentUserImage={currentUserImage}
            handleCreatePerson={handlers.handleCreatePerson}
          />
        );

      case "person-edit":
        return (
          <PersonEditSheetContent
            sheet={sheet}
            plan={plan}
            readOnly={readOnly}
            currentUserId={currentUserId}
            handleUpdatePerson={handlers.handleUpdatePerson}
            handleDeletePerson={handlers.handleDeletePerson}
          />
        );

      case "share":
        return (
          <ShareModal
            slug={slug}
            adminKey={writeKey}
            onClose={() => setSheet(null)}
            isNew={searchParams.get("new") === "true"}
            eventName={plan.event?.name}
          />
        );

      case "guest-access":
        return (
          <GuestAccessSheet
            open
            onClose={() => {
              setSheet(null);
              onDismissGuestPrompt();
            }}
            onAuth={onAuth}
            onCreateGuest={() => {
              setSheet({ type: "person", context: "join" });
              onDismissGuestPrompt();
            }}
          />
        );

      case "claim-person":
        return (
          <ClaimPersonSheet
            open
            unclaimed={sheet.unclaimed}
            onClose={() => setSheet(null)}
            onClaim={async (id) => {
              try {
                await handlers.handleClaimPerson(id);
                setSheet(null);
              } catch {
                // Error handled in handler
              }
            }}
            onJoinNew={onJoinNew}
          />
        );

      case "shopping-list":
        return (
          <ShoppingListSheet
            person={sheet.person}
            plan={plan}
            slug={slug}
            writeKey={writeKey}
            onToggleIngredient={handlers.handleToggleIngredient}
            onToggleItemChecked={handlers.handleToggleItemChecked}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Drawer
        open={!!sheet && sheet.type !== "item-ingredients" && sheet.type !== "event-edit"}
        onOpenChange={(open) => !open && setSheet(null)}
      >
        <DrawerContent
          className={cn(
            "px-4 sm:px-6",
            sheet?.type === "share" && "bg-gray-900/95 backdrop-blur-xl"
          )}
          overlayClassName={sheet?.type === "share" ? "bg-black/90 z-[150]" : undefined}
        >
          <DrawerHeader className="px-0 pb-3 text-left sm:pb-4">
            {sheet?.type === "share" ? (
              <DrawerTitle className="sr-only">{getTitle()}</DrawerTitle>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DrawerTitle className="text-lg sm:text-xl">{getTitle()}</DrawerTitle>
                </div>
                <DrawerClose asChild>
                  <button
                    className="touch-manipulation rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95"
                    aria-label={tCommon("close")}
                  >
                    <X size={18} />
                  </button>
                </DrawerClose>
              </div>
            )}
          </DrawerHeader>
          <div className="scrollbar-none min-h-[60vh] flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-8 sm:pb-20">
            {renderSheetContent()}
          </div>
        </DrawerContent>
      </Drawer>

      {sheet?.type === "item-ingredients" && (
        <IngredientsSheetContent
          sheet={sheet}
          setSheet={setSheet}
          locale={locale}
          readOnly={readOnly}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          setSuccessMessage={setSuccessMessage}
          currentUserId={currentUserId}
          onAuth={onAuth}
          findItem={handlers.findItem}
          handleGenerateIngredients={handlers.handleGenerateIngredients}
          handleToggleIngredient={handlers.handleToggleIngredient}
          handleDeleteIngredient={handlers.handleDeleteIngredient}
          handleCreateIngredient={handlers.handleCreateIngredient}
          handleDeleteAllIngredients={handlers.handleDeleteAllIngredients}
          handleSaveFeedback={handlers.handleSaveFeedback}
          justGenerated={handlers.justGenerated}
        />
      )}

      {sheet?.type === "event-edit" && plan.event && (
        <EditEventSheet
          open
          onClose={() => setSheet(null)}
          initialData={{
            name: plan.event.name,
            description: plan.event.description,
            adults: plan.event.adults,
            children: plan.event.children,
            date: plan.meals[0]?.date,
            time: plan.meals[0]?.time,
            address: plan.meals[0]?.address,
            mealId: plan.meals[0]?.id,
          }}
          onSubmit={(data) => {
            startEventTransition(async () => {
              await updateEventWithMealAction({
                slug,
                key: writeKey,
                name: data.name,
                description: data.description,
                adults: data.adults,
                children: data.children,
                mealId: data.mealId,
                date: data.date,
                time: data.time,
                address: data.address,
              });
              setSheet(null);
            });
          }}
          isPending={isEventPending}
        />
      )}
    </>
  );
}
