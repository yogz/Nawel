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
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { type PlanData, type Item } from "@/lib/types";
import { TabBar } from "../tab-bar";
import { useThemeMode } from "../theme-provider";
import { validateWriteKeyAction, getChangeLogsAction, joinEventAction } from "@/app/actions";
import { useSession } from "@/lib/auth-client";

// Extracted Components
import { OrganizerHeader } from "./organizer-header";
import { SuccessToast } from "../common/success-toast";
import { OrganizerSheets } from "./organizer-sheets";
import { PlanningTab } from "./planning-tab";
import { PeopleTab } from "./people-tab";
import { SettingsTab } from "./settings-tab";
import { ShoppingTab } from "./shopping-tab";
import { AuthModal } from "../auth/auth-modal";

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";
import { useEventHandlers } from "@/hooks/use-event-handlers";

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
    activeItemId,
    setActiveItemId,
    successMessage,
    setSuccessMessage,
    logsLoading,
    setLogsLoading,
    unassignedItemsCount,
  } = useEventState(initialPlan, initialWriteEnabled);

  const { data: session, isPending: isSessionLoading } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hasDismissedGuestPrompt, setHasDismissedGuestPrompt] = useState(() => {
    // Initialize from localStorage (only on client)
    if (typeof window !== "undefined") {
      return localStorage.getItem("nawel_guest_prompt_dismissed") === "true";
    }
    return false;
  });

  // Persist guest prompt dismissal to localStorage
  const dismissGuestPrompt = () => {
    setHasDismissedGuestPrompt(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("nawel_guest_prompt_dismissed", "true");
    }
  };

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
    handleMoveItem,
    handleDelete,
    findItem,
    handleDeleteEvent,
    handleClaimPerson,
    handleUnclaimPerson,
    handleCreatePerson,
  } = handlers;

  // State for ingredient generation
  const [isGenerating, setIsGenerating] = useState(false);

  const { christmas } = useThemeMode();
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
      if (isParticipant) return;

      // Find unclaimed people
      const unclaimed = plan.people.filter((p) => !p.userId);

      if (unclaimed.length > 0) {
        // If sheet is already open (like guest-access or just closing one), don't override immediately
        // unless it's specifically for joining.
        if (!sheet || sheet.type === "guest-access") {
          setSheet({ type: "claim-person", unclaimed });
        }
      } else {
        // No one to claim, automatically join
        joinEventAction({ slug, key: writeKey }).then((result) => {
          if (result && !plan.people.some((p) => p.id === result.id)) {
            setPlan((prev) => ({
              ...prev,
              people: [...prev.people, result].sort((a, b) => a.name.localeCompare(b.name)),
            }));
          }
        });
      }
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
        slug={slug}
        writeKey={writeKey}
      />

      <SuccessToast
        message={successMessage?.text || null}
        type={successMessage?.type || "success"}
        christmas={christmas}
      />

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
            }}
            onAssign={(item: Item, serviceId?: number) =>
              setSheet({ type: "item", serviceId, item })
            }
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
            currentUserId={session?.user?.id}
            onClaim={handleClaimPerson}
            onUnclaim={handleUnclaimPerson}
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

        {tab === "shopping" && (
          <ShoppingTab
            plan={plan}
            slug={slug}
            writeKey={writeKey}
            currentUserId={session?.user?.id}
          />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} isAuthenticated={!!session?.user} />

      <OrganizerSheets
        sheet={sheet}
        setSheet={setSheet}
        plan={plan}
        slug={slug}
        writeKey={writeKey}
        readOnly={readOnly}
        handlers={handlers}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        setSuccessMessage={setSuccessMessage}
        planningFilter={planningFilter}
        setPlanningFilter={setPlanningFilter}
        currentUserId={session?.user?.id}
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

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
