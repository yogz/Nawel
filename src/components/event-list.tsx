"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEventAction } from "@/app/actions";
import { Calendar, Plus } from "lucide-react";
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
};

export function EventList({
  events,
  writeEnabled,
  writeKey, // Kept for determining if we have a key for existing events, partially legacy/pre-fill
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Événements</h2>
        {writeEnabled && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            <Plus size={16} />
            Nouvel événement
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="space-y-6 rounded-2xl border border-black/[0.03] bg-white p-12 text-center shadow-sm">
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
        <div className="space-y-3">
          {events.map((event) => {
            const isOwner = session?.user?.id === event.ownerId;
            return (
              <Link
                key={event.id}
                href={`/event/${event.slug}${isOwner ? `?key=${event.adminKey}` : ""}`}
                className="group relative block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-accent/30 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-accent">
                    {event.name}
                  </h3>
                  {isOwner && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                      Propriétaire
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={14} />
                  <span>/{event.slug}</span>
                </div>
              </Link>
            );
          })}
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
