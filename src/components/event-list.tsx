"use client";

import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { createEventAction, updateEventAction, deleteEventAction } from "@/app/actions";
import { Calendar, Plus, Clock, History, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { EventForm } from "@/features/events/components/event-form";
import { useTranslations } from "next-intl";

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
  meals?: { date: string }[];
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
  const tShared = useTranslations("EventDashboard.Shared");

  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleCreateEvent = async (
    slug: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string,
    adults?: number,
    children?: number
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({
          slug,
          name,
          description,
          key: key || writeKey,
          creationMode,
          date,
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

  const handleUpdateEvent = async (
    slug: string,
    name: string,
    description?: string,
    _creationMode?: string,
    date?: string,
    _key?: string,
    adults?: number,
    children?: number
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateEventAction({
          slug,
          name,
          description,
          key: writeKey || editingEvent?.adminKey || undefined,
          adults: adults ?? 0,
          children: children ?? 0,
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
        setDeleteConfirmText("");
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
            // Always include the adminKey if available, so clicking from dashboard opens in edit mode
            const url = `/event/${event.slug}${event.adminKey ? `?key=${event.adminKey}` : ""}`;

            return (
              <Link
                key={event.id}
                href={url}
                className="group relative block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-accent/30 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-accent">
                      {event.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} />
                      <span>/{event.slug}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent ring-1 ring-accent/20">
                      {t("myEvent")}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{event.description}</p>
                )}

                {isOwner && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-50 pt-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingEvent(event);
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <Pencil size={12} />
                      {t("edit")}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingEvent(event);
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                      {t("delete")}
                    </button>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black">{t("title")}</h2>
        {writeEnabled && (
          <Button
            variant="premium"
            className="h-10 pr-6"
            icon={<Plus size={16} />}
            onClick={() => setShowCreateForm(true)}
            shine
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              <span className="hidden sm:inline">{t("newEvent")}</span>
              <span className="sm:hidden">{t("new")}</span>
            </span>
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="space-y-10 rounded-[32px] border border-black/[0.03] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 text-accent">
            <Calendar size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-text">{t("noEvents")}</h3>
            <p className="mx-auto max-w-[240px] text-xs font-medium leading-relaxed text-gray-400">
              {t("noEventsDescription")}
            </p>
          </div>
          {writeEnabled && (
            <div className="flex justify-center">
              <Button
                variant="premium"
                className="py-7 pr-8 shadow-xl shadow-accent/10"
                icon={<Plus size={18} />}
                onClick={() => setShowCreateForm(true)}
                shine
              >
                <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                  {t("createFirst")}
                </span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {renderSection(t("upcoming"), categorized.upcoming, <Clock size={16} />)}
          {renderSection(t("past"), categorized.past, <History size={16} />)}
        </div>
      )}

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
        <EventForm
          initialData={{
            name: editingEvent.name,
            description: editingEvent.description,
            adults: editingEvent.adults,
            children: editingEvent.children,
            date: todayStr, // Default if not found
            slug: editingEvent.slug,
          }}
          onSubmit={handleUpdateEvent}
          onClose={() => {
            setEditingEvent(null);
            setError(null);
          }}
          isPending={isPending}
          error={error}
        />
      )}

      {deletingEvent && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full duration-300 animate-in fade-in slide-in-from-bottom-4 sm:max-w-md">
            <div className="mx-auto mb-2 flex h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
            <div className="rounded-t-[32px] border-x border-t border-white/20 bg-white p-8 shadow-2xl sm:rounded-[32px] sm:border">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={() => setDeletingEvent(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900">{t("deleteConfirmTitle")}</h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {t("deleteConfirmDescription")}
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {t("deleteConfirmInstruction", { name: deletingEvent.name })}
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={t("deleteConfirmPlaceholder")}
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/50 px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-red-500/50 focus:bg-white"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingEvent(null)}
                    className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-4 text-xs font-black uppercase tracking-widest text-gray-500 transition-all active:scale-95"
                  >
                    {t("deleteCancelButton")}
                  </button>
                  <button
                    disabled={deleteConfirmText !== deletingEvent.name || isPending}
                    onClick={handleDeleteEvent}
                    className="flex-[2] rounded-2xl bg-red-500 px-4 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:scale-100 disabled:opacity-30"
                  >
                    {isPending ? tShared("deleting") : t("deleteConfirmButton")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
