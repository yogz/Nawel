"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { type PlanData, type Item } from "@/lib/types";
import { TabBar } from "../layout";
import { validateWriteKeyAction, joinEventAction } from "@/app/actions";
import { useSession } from "@/lib/auth-client";

// Lightweight components loaded immediately
import { EventPlannerHeader } from "./event-planner-header";
import { SuccessToast } from "../common/success-toast";

// Heavy components loaded lazily (code-splitting)
const EventPlannerSheets = lazy(() =>
  import("./event-planner-sheets").then((m) => ({ default: m.EventPlannerSheets }))
);
const PlanningTab = lazy(() => import("./planning-tab").then((m) => ({ default: m.PlanningTab })));
const PeopleTab = lazy(() => import("./people-tab").then((m) => ({ default: m.PeopleTab })));
const ShoppingTab = lazy(() => import("./shopping-tab").then((m) => ({ default: m.ShoppingTab })));
const AuthModal = lazy(() => import("../auth/auth-modal").then((m) => ({ default: m.AuthModal })));

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";

// Feature-specific hooks (imported directly for better tree-shaking)
import { useItemHandlers } from "@/features/items";
import { useMealHandlers } from "@/features/meals";
import { useServiceHandlers } from "@/features/services";
import { usePersonHandlers } from "@/features/people";
import { useIngredientHandlers } from "@/features/ingredients";
import { useEventHandlers as useEventDeleteHandler } from "@/features/events";

// Loading skeleton for tabs
function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-50" />
        ))}
      </div>
    </div>
  );
}

export function EventPlanner({
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
    sheet,
    setSheet,
    selectedPerson,
    setSelectedPerson,
    readOnly,
    setReadOnly,
    activeItemId,
    setActiveItemId,
    successMessage,
    setSuccessMessage,
  } = useEventState(initialPlan, initialWriteEnabled);

  const { data: session, isPending: isSessionLoading, refetch } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hasDismissedGuestPrompt, setHasDismissedGuestPrompt] = useState(() => {
    // Initialize from localStorage (only on client)
    if (typeof window !== "undefined") {
      return localStorage.getItem("colist_guest_prompt_dismissed") === "true";
    }
    return false;
  });

  // Persist guest prompt dismissal to localStorage
  const dismissGuestPrompt = () => {
    setHasDismissedGuestPrompt(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("colist_guest_prompt_dismissed", "true");
    }
  };

  const isOwner = session?.user?.id === plan.event?.ownerId;
  const effectiveWriteKey =
    writeKey || (isOwner && plan.event?.adminKey ? plan.event.adminKey : undefined);

  // Base params shared by all feature hooks
  const handlerParams = {
    plan,
    setPlan,
    slug,
    writeKey: effectiveWriteKey,
    readOnly,
    setSheet,
    setSuccessMessage,
    session,
    refetch,
  };

  // Call individual feature hooks
  const itemHandlers = useItemHandlers(handlerParams);
  const mealHandlers = useMealHandlers(handlerParams);
  const serviceHandlers = useServiceHandlers(handlerParams);
  const personHandlers = usePersonHandlers({ ...handlerParams, setSelectedPerson });
  const ingredientHandlers = useIngredientHandlers(handlerParams);
  const eventHandlers = useEventDeleteHandler(handlerParams);

  // Combine all handlers for components that need the full set
  const handlers = {
    // Item handlers
    handleCreateItem: itemHandlers.handleCreateItem,
    handleUpdateItem: itemHandlers.handleUpdateItem,
    handleAssign: itemHandlers.handleAssign,
    handleDelete: itemHandlers.handleDelete,
    handleMoveItem: itemHandlers.handleMoveItem,
    findItem: itemHandlers.findItem,
    handleToggleItemChecked: itemHandlers.handleToggleItemChecked,

    // Meal handlers
    handleCreateMeal: mealHandlers.handleCreateMeal,
    handleCreateMealWithServices: mealHandlers.handleCreateMealWithServices,
    handleUpdateMeal: mealHandlers.handleUpdateMeal,
    handleDeleteMeal: (meal: { id: number }) => mealHandlers.handleDeleteMeal(meal.id),

    // Service handlers
    handleCreateService: serviceHandlers.handleCreateService,
    handleUpdateService: serviceHandlers.handleUpdateService,
    handleDeleteService: (service: { id: number }) =>
      serviceHandlers.handleDeleteService(service.id),

    // Person handlers
    handleCreatePerson: personHandlers.handleCreatePerson,
    handleUpdatePerson: personHandlers.handleUpdatePerson,
    handleDeletePerson: personHandlers.handleDeletePerson,
    handleClaimPerson: personHandlers.handleClaimPerson,
    handleUnclaimPerson: personHandlers.handleUnclaimPerson,

    // Event handlers
    handleDeleteEvent: eventHandlers.handleDeleteEvent,
    handleUpdateEvent: eventHandlers.handleUpdateEvent,

    // Ingredient handlers
    handleGenerateIngredients: ingredientHandlers.handleGenerateIngredients,
    handleToggleIngredient: ingredientHandlers.handleToggleIngredient,
    handleDeleteIngredient: ingredientHandlers.handleDeleteIngredient,
    handleCreateIngredient: ingredientHandlers.handleCreateIngredient,
    handleDeleteAllIngredients: ingredientHandlers.handleDeleteAllIngredients,
    handleSaveFeedback: ingredientHandlers.handleSaveFeedback,
    justGenerated: ingredientHandlers.justGenerated,
  };

  // Destructure commonly used handlers for local use
  const {
    handleMoveItem,
    handleDelete,
    findItem,
    handleDeleteEvent,
    handleClaimPerson,
    handleUnclaimPerson,
    handleAssign,
  } = handlers;

  // State for ingredient generation
  const [isGenerating, setIsGenerating] = useState(false);

  const searchParams = useSearchParams();

  // Memoize sensors to avoid re-creating on every render
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  // Memoized drag handlers to prevent unnecessary re-renders
  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      setActiveItemId(Number(e.active.id));
    },
    [setActiveItemId]
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveItemId(null);
      const { active, over } = e;
      if (!over || !active.id) {
        return;
      }
      const itemId = Number(active.id);
      const found = findItem(itemId);
      if (!found) {
        return;
      }

      if (typeof over.id === "string" && over.id.startsWith("service-")) {
        handleMoveItem(itemId, Number(over.id.replace("service-", "")));
      } else if (typeof over.id === "number") {
        const targetItem = findItem(over.id);
        if (targetItem && targetItem.service.id !== found.service.id) {
          const targetIndex = targetItem.service.items.findIndex((i) => i.id === over.id);
          handleMoveItem(itemId, targetItem.service.id, targetIndex);
        }
      }
    },
    [setActiveItemId, findItem, handleMoveItem]
  );

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setSheet({ type: "share" });
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ea580c", "#ef4444", "#fbbf24", "#ffffff"],
          zIndex: 200,
        });
      }, 300);

      // Clear the "new" parameter from the URL without a full page reload
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, setSheet]);

  // Auto-join / Claim effect
  useEffect(() => {
    if (session?.user?.id && !readOnly) {
      // Check if user is already a participant
      const isParticipant = plan.people.some((p) => p.userId === session.user.id);
      if (isParticipant) {
        return;
      }

      // Automatically join to ensure visibility in dashboard
      joinEventAction({ slug, key: writeKey }).then((result) => {
        if (result && !plan.people.some((p) => p.id === result.id)) {
          setPlan((prev) => ({
            ...prev,
            people: [...prev.people, result].sort((a, b) => a.name.localeCompare(b.name)),
          }));
        }

        // After joining, check if there are unclaimed people they might want to claim instead
        const unclaimed = plan.people.filter((p) => !p.userId);
        if (unclaimed.length > 0) {
          if (!sheet || sheet.type === "guest-access") {
            setSheet({ type: "claim-person", unclaimed });
          }
        }
      });
    }
  }, [session, slug, writeKey, readOnly, plan.people, setPlan, sheet, setSheet]);

  // Guest prompt effect
  useEffect(() => {
    if (
      !session &&
      !isSessionLoading &&
      !readOnly &&
      !hasDismissedGuestPrompt &&
      !sheet &&
      !isAuthModalOpen
    ) {
      setSheet({ type: "guest-access" });
    }
  }, [
    session,
    isSessionLoading,
    readOnly,
    hasDismissedGuestPrompt,
    sheet,
    setSheet,
    isAuthModalOpen,
  ]);

  useEffect(() => {
    validateWriteKeyAction({ key: writeKey, slug }).then((ok) => setReadOnly(!ok));
  }, [writeKey, slug, setReadOnly]);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        paddingBottom: `calc(6rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* Immersive background at the top */}
      <div
        className="fixed inset-x-0 top-0 h-[400px] pointer-events-none z-0"
        style={{
          background: `linear-gradient(to bottom, #ec4899 0%, #a855f7 40%, #6366f1 80%, transparent 100%)`,
          opacity: 0.6,
          filter: "blur(120px)",
          transform: "translateY(-150px)",
        }}
      />
      <EventPlannerHeader
        readOnly={readOnly}
        tab={tab}
        setTab={setTab}
        plan={plan}
        setSheet={setSheet}
        sheet={sheet}
        slug={slug}
        writeKey={effectiveWriteKey}
        handlers={handlers}
      />

      <SuccessToast
        message={successMessage?.text || null}
        type={successMessage?.type || "success"}
      />

      <div className="mx-auto w-full max-w-3xl flex-1">
        <main className="space-y-4 px-2 pt-0 pb-6 sm:px-2 sm:pt-0 sm:pb-4">
          <Suspense fallback={<TabSkeleton />}>
            {tab === "planning" && (
              <PlanningTab
                plan={plan}
                activeItemId={activeItemId}
                readOnly={readOnly}
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onAssign={(item: Item, serviceId?: number) =>
                  setSheet({ type: "item", serviceId, item })
                }
                onDelete={handleDelete}
                onCreateItem={(serviceId: number) => setSheet({ type: "item", serviceId })}
                onCreateService={(mealId) => setSheet({ type: "service", mealId })}
                setSheet={setSheet}
                sheet={sheet}
                slug={slug}
                writeKey={effectiveWriteKey}
                isOwner={isOwner}
                onDeleteEvent={handleDeleteEvent}
                handleAssign={handleAssign}
                currentUserId={session?.user?.id}
              />
            )}

            {tab === "people" && (
              <PeopleTab
                plan={plan}
                slug={slug}
                writeKey={effectiveWriteKey}
                selectedPerson={selectedPerson}
                setSelectedPerson={setSelectedPerson}
                setSheet={setSheet}
                readOnly={readOnly}
                currentUserId={session?.user?.id}
                onClaim={handleClaimPerson}
                onUnclaim={handleUnclaimPerson}
              />
            )}

            {tab === "shopping" && (
              <ShoppingTab
                plan={plan}
                slug={slug}
                writeKey={effectiveWriteKey}
                currentUserId={session?.user?.id}
              />
            )}
          </Suspense>
        </main>

        <TabBar active={tab} onChange={setTab} isAuthenticated={!!session?.user} />
      </div>

      {/* Lazy-loaded sheets - only downloaded when a sheet is opened */}
      <Suspense fallback={null}>
        <EventPlannerSheets
          sheet={sheet}
          setSheet={setSheet}
          plan={plan}
          slug={slug}
          writeKey={effectiveWriteKey}
          readOnly={readOnly}
          handlers={handlers}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          currentUserId={session?.user?.id}
          currentUserImage={session?.user?.image}
          onAuth={() => {
            setSheet(null); // Close guest-access sheet first
            setIsAuthModalOpen(true);
          }}
          onDismissGuestPrompt={dismissGuestPrompt}
          onJoinNew={() => {
            joinEventAction({ slug, key: writeKey }).then((result) => {
              if (result && !plan.people.some((p) => p.id === result.id)) {
                setPlan((prev) => ({
                  ...prev,
                  people: [...prev.people, result].sort((a, b) => a.name.localeCompare(b.name)),
                }));
              }
              setSheet(null);
            });
          }}
        />
      </Suspense>

      {/* Lazy-loaded auth modal */}
      <Suspense fallback={null}>
        <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </Suspense>
    </div>
  );
}
