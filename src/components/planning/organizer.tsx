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
import { TabBar } from "../tab-bar";
import { useThemeMode } from "../theme-provider";
import { validateWriteKeyAction, getChangeLogsAction, joinEventAction } from "@/app/actions";
import { useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { DeleteEventDialog } from "../common/delete-event-dialog";
import { Trash2 } from "lucide-react";

// Lightweight components loaded immediately
import { OrganizerHeader } from "./organizer-header";
import { SuccessToast } from "../common/success-toast";

// Heavy components loaded lazily (code-splitting)
const OrganizerSheets = lazy(() =>
  import("./organizer-sheets").then((m) => ({ default: m.OrganizerSheets }))
);
const PlanningTab = lazy(() => import("./planning-tab").then((m) => ({ default: m.PlanningTab })));
const PeopleTab = lazy(() => import("./people-tab").then((m) => ({ default: m.PeopleTab })));
const SettingsTab = lazy(() => import("./settings-tab").then((m) => ({ default: m.SettingsTab })));
const ShoppingTab = lazy(() => import("./shopping-tab").then((m) => ({ default: m.ShoppingTab })));
const AuthModal = lazy(() => import("../auth/auth-modal").then((m) => ({ default: m.AuthModal })));

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";
import { useEventHandlers } from "@/hooks/use-event-handlers";

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
    setLogs,
    planningFilter,
    setPlanningFilter,
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
    setLogsLoading,
    unassignedItemsCount,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handlers = useEventHandlers({
    plan,
    setPlan,
    slug,
    writeKey: effectiveWriteKey,
    readOnly,
    setSheet,
    setSelectedPerson,
    setSuccessMessage,
    session,
    refetch,
  });

  const {
    handleMoveItem,
    handleDelete,
    findItem,
    handleDeleteEvent: originalHandleDeleteEvent,
    handleClaimPerson,
    handleUnclaimPerson,
  } = handlers;

  // Wrap handleDeleteEvent
  const handleDeleteEvent = () => {
    originalHandleDeleteEvent();
  };

  // State for ingredient generation
  const [isGenerating, setIsGenerating] = useState(false);

  const tOrganizer = useTranslations("EventDashboard.Organizer");
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

  useEffect(() => {
    if (tab === "settings") {
      setLogsLoading(true);
      getChangeLogsAction({ slug })
        .then(setLogs)
        .finally(() => setLogsLoading(false));
    }
  }, [tab, slug, setLogs, setLogsLoading]);

  return (
    <div className="flex min-h-screen flex-col pb-24 text-gray-900">
      <OrganizerHeader
        readOnly={readOnly}
        tab={tab}
        plan={plan}
        planningFilter={planningFilter}
        setPlanningFilter={setPlanningFilter}
        setSheet={setSheet}
        sheet={sheet}
        unassignedItemsCount={unassignedItemsCount}
        slug={slug}
        writeKey={effectiveWriteKey}
      />

      <SuccessToast
        message={successMessage?.text || null}
        type={successMessage?.type || "success"}
      />

      <div className="mx-auto w-full max-w-3xl flex-1">
        <main className="space-y-4 px-3 py-4">
          <Suspense fallback={<TabSkeleton />}>
            {tab === "planning" && (
              <PlanningTab
                plan={plan}
                planningFilter={planningFilter}
                setPlanningFilter={setPlanningFilter}
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
                onCreateService={() =>
                  setSheet({ type: "service", mealId: plan.meals[0]?.id ?? -1 })
                }
                setSheet={setSheet}
                sheet={sheet}
                slug={slug}
                writeKey={effectiveWriteKey}
              />
            )}

            {tab === "people" && (
              <PeopleTab
                plan={plan}
                selectedPerson={selectedPerson}
                setSelectedPerson={setSelectedPerson}
                setSheet={setSheet}
                readOnly={readOnly}
                currentUserId={session?.user?.id}
                onClaim={handleClaimPerson}
                onUnclaim={handleUnclaimPerson}
              />
            )}

            {tab === "settings" && (
              <SettingsTab onDeleteEvent={handleDeleteEvent} readOnly={readOnly} />
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

        {isOwner && (
          <div className="mt-8 flex justify-center pb-8 opacity-20 transition-opacity hover:opacity-100">
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-500"
            >
              <Trash2 size={12} /> {tOrganizer("deleteEvent")}
            </button>
          </div>
        )}
      </div>

      <DeleteEventDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        eventName={plan.event?.name || slug}
        onConfirm={handleDeleteEvent}
      />

      {/* Lazy-loaded sheets - only downloaded when a sheet is opened */}
      <Suspense fallback={null}>
        <OrganizerSheets
          sheet={sheet}
          setSheet={setSheet}
          plan={plan}
          slug={slug}
          writeKey={effectiveWriteKey}
          readOnly={readOnly}
          handlers={handlers}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          setSuccessMessage={setSuccessMessage}
          planningFilter={planningFilter}
          setPlanningFilter={setPlanningFilter}
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
