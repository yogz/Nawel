"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEventAction } from "@/app/actions";
import { Calendar, Plus, Clock, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { EventForm } from "@/features/events/components/event-form";

type Event = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  adminKey: string | null;
  ownerId: string | null;
  meals?: { date: string }[];
};

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

  const [error, setError] = useState<string | null>(null);

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
        const message = e instanceof Error ? e.message : "Une erreur est survenue";
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
                      Mon Événement
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{event.description}</p>
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
        <h2 className="text-xl font-black">Événements</h2>
        {writeEnabled && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouvel événement</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="space-y-6 rounded-3xl border border-black/[0.03] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 text-accent">
            <Calendar size={40} />
          </div>
          <div>
            <p className="text-lg font-bold text-text">Aucun événement pour l&apos;instant</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              Créez votre premier événement pour commencer à organiser vos fêtes ! 🎁
            </p>
          </div>
          {writeEnabled && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              Créer mon premier événement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {renderSection("À venir", categorized.upcoming, <Clock size={16} />)}
          {renderSection("Passés", categorized.past, <History size={16} />)}
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
    </div>
  );
}
