"use client";

import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { createEventAction, updateEventWithMealAction, deleteEventAction } from "@/app/actions";
import { Calendar, Plus, Clock, History, Pencil, Trash2, Users, ArrowRight } from "lucide-react";
import { SwipeableCard } from "./ui/swipeable-card";
import { DeleteEventDialog } from "./common/delete-event-dialog";
import { useSession } from "@/lib/auth-client";
import { EventForm } from "@/features/events/components/event-form";
import { NewEventCard } from "./events/new-event-card";
import { EditEventSheet } from "@/features/events/components/edit-event-sheet";
import { useTranslations, useFormatter } from "next-intl";

type Meal = {
  id: number;
  date: string;
  time?: string | null;
  address?: string | null;
};

type Event = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  adminKey: string | null;
  ownerId: string | null;
  adults: number;
  children: number;
  meals?: Meal[];
};

import { Button } from "./ui/button";

export function EventList({
  events,
  writeEnabled,
  writeKey,
}: {
  events: Event[];
  writeEnabled: boolean;
  writeKey?: string;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations("Dashboard.EventList");
  const format = useFormatter();

  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  const handleCreateEvent = async (
    hint: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({
          slug: hint, // Server uses this as base for auto-generated slug
          name,
          description,
          creationMode,
          date,
          time,
          address,
          adults: adults ?? 0,
          children: children ?? 0,
        });
        router.push(`/event/${result.slug}?key=${result.adminKey}&new=true`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("errorOccurred");
        setError(message);
      }
    });
  };

  const handleUpdateEvent = async (data: {
    name: string;
    description?: string;
    adults: number;
    children: number;
    mealId?: number;
    date?: string;
    time?: string;
    address?: string;
  }) => {
    if (!editingEvent) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateEventWithMealAction({
          slug: editingEvent.slug,
          key: writeKey || editingEvent.adminKey || undefined,
          name: data.name,
          description: data.description,
          adults: data.adults,
          children: data.children,
          mealId: data.mealId,
          date: data.date,
          time: data.time,
          address: data.address,
        });
        setEditingEvent(null);
        router.refresh();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("errorOccurred");
        setError(message);
      }
    });
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteEventAction({
          slug: deletingEvent.slug,
          key: writeKey || deletingEvent.adminKey || undefined,
        });
        setDeletingEvent(null);
        router.refresh();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("errorOccurred");
        setError(message);
      }
    });
  };

  // Grouping logic
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const categorized = events.reduce(
    (acc, event) => {
      // Determine the most relevant date for categorization
      // Either the last meal date, or the createdAt date if no meals
      let eventDateStr = event.createdAt
        ? new Date(event.createdAt).toISOString().split("T")[0]
        : todayStr;

      if (event.meals && event.meals.length > 0) {
        // Find the latest meal date
        const mealDates = event.meals.map((m) => m.date).sort();
        eventDateStr = mealDates[mealDates.length - 1];
      }

      if (eventDateStr >= todayStr) {
        acc.upcoming.push(event);
      } else {
        acc.past.push(event);
      }
      return acc;
    },
    { upcoming: [] as Event[], past: [] as Event[] }
  );

  const renderSection = (title: string, items: Event[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
          {icon}
          <span>{title}</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
            {items.length}
          </span>
        </div>
        <div className="space-y-3">
          {items.map((event) => {
            const isOwner = session?.user?.id === event.ownerId;
            const url = `/event/${event.slug}${event.adminKey ? `?key=${event.adminKey}` : ""}`;

            const cardContent = (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if (!e.defaultPrevented) {
                    router.push(url);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(url);
                  }
                }}
                className="group relative block cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white p-0 shadow-sm transition-all hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 active:scale-[0.99]"
              >
                {/* Decorative background gradient */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/10" />

                <div className="relative flex flex-col p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-black tracking-tight text-gray-900 transition-colors group-hover:text-accent">
                        {event.name}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isOwner && (
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-accent ring-1 ring-accent/20">
                          {t("myEvent")}
                        </span>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-2 line-clamp-1 text-[11px] font-medium leading-tight text-gray-500">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-3">
                      {/* Date details if available */}
                      {event.meals && event.meals.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-gray-50/50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                          <Calendar size={10} className="text-gray-400" />
                          <span>
                            {format.dateTime(new Date(event.meals[0].date), {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      )}

                      {/* Guests count */}
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-50/50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        <Users size={10} className="text-gray-400" />
                        <span>{event.adults + event.children}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Desktop Actions */}
                      <div className="hidden items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 lg:flex">
                        <div className="flex h-7 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 text-[10px] font-bold text-gray-600 transition-colors hover:bg-accent hover:text-white">
                          {t("view")}
                        </div>
                        {isOwner && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingEvent(event);
                              }}
                              className="flex h-7 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 text-[10px] font-bold text-gray-600 transition-colors hover:bg-accent hover:text-white"
                            >
                              {t("edit")}
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingEvent(event);
                              }}
                              className="flex h-7 items-center gap-1.5 rounded-lg bg-red-50 px-2.5 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-500 hover:text-white"
                            >
                              {t("delete")}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all group-hover:bg-accent group-hover:text-white lg:group-hover:hidden">
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div key={event.id}>
                {isOwner ? (
                  <SwipeableCard
                    onSwipeLeft={() => setDeletingEvent(event)}
                    onSwipeRight={() => setEditingEvent(event)}
                    leftLabel={t("delete")}
                    rightLabel={t("edit")}
                  >
                    {cardContent}
                  </SwipeableCard>
                ) : (
                  cardContent
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {writeEnabled && (
          <div className="sm:col-span-1 lg:col-span-1">
            <NewEventCard onClick={() => setShowCreateForm(true)} />
          </div>
        )}
        {events.length > 0 && (
          <div className="col-span-1 space-y-10 sm:col-span-1 lg:col-span-2">
            {renderSection(t("upcoming"), categorized.upcoming, <Clock size={16} />)}
            {renderSection(t("past"), categorized.past, <History size={16} />)}
          </div>
        )}
      </div>

      {showCreateForm && (
        <EventForm
          onSubmit={handleCreateEvent}
          onClose={() => {
            setShowCreateForm(false);
            setError(null);
          }}
          isPending={isPending}
          error={error}
        />
      )}
      {editingEvent && (
        <EditEventSheet
          open={!!editingEvent}
          onClose={() => {
            setEditingEvent(null);
            setError(null);
          }}
          initialData={{
            name: editingEvent.name,
            description: editingEvent.description,
            adults: editingEvent.adults,
            children: editingEvent.children,
            // Get first meal data if available
            date: editingEvent.meals?.[0]?.date,
            time: editingEvent.meals?.[0]?.time,
            address: editingEvent.meals?.[0]?.address,
            mealId: editingEvent.meals?.[0]?.id,
          }}
          onSubmit={handleUpdateEvent}
          isPending={isPending}
        />
      )}

      <DeleteEventDialog
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        eventName={deletingEvent?.name || ""}
        onConfirm={handleDeleteEvent}
        isPending={isPending}
      />
    </div>
  );
}
