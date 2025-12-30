"use client";

import { lazy, Suspense, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

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

  const isOwner = session?.user?.id === plan.event?.ownerId;
  const effectiveWriteKey =
    writeKey || (isOwner && plan.event?.adminKey ? plan.event.adminKey : undefined);

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
        writeKey={effectiveWriteKey}
      />

      <SuccessToast
        message={successMessage?.text || null}
        type={successMessage?.type || "success"}
        christmas={christmas}
      />

      <main className="flex-1 space-y-4 px-4 py-8">
        <Suspense fallback={<TabSkeleton />}>
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
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-500">
                <Trash2 size={12} /> {useTranslations("EventDashboard.Organizer")("deleteEvent")}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {useTranslations("EventDashboard.Organizer")("deleteConfirmTitle")}
                </DialogTitle>
                <DialogDescription>
                  {useTranslations("EventDashboard.Organizer")("deleteConfirmDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <p className="text-text/60 text-xs font-semibold">
                  {useTranslations("EventDashboard.Organizer")("deleteConfirmInstruction", {
                    name: plan.event?.name || slug,
                  })}
                </p>
                <Input
                  value={deleteConfirmationText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDeleteConfirmationText(e.target.value)
                  }
                  placeholder={useTranslations("EventDashboard.Organizer")(
                    "deleteConfirmPlaceholder"
                  )}
                  className="rounded-xl border-red-100 bg-red-50/20 focus:border-red-300 focus:ring-red-200"
                />
              </div>
              <DialogFooter className="gap-2">
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {useTranslations("EventDashboard.Organizer")("deleteCancelButton")}
                  </Button>
                </DialogTrigger>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={handleDeleteEvent}
                  disabled={deleteConfirmationText !== (plan.event?.name || slug)}
                >
                  {useTranslations("EventDashboard.Organizer")("deleteConfirmButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
