"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEventAction } from "@/app/actions";
import { Calendar, Plus } from "lucide-react";
import { BottomSheet } from "./ui/bottom-sheet";
import { useRouter } from "next/navigation";

type Event = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  adminKey: string | null;
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

  const [error, setError] = useState<string | null>(null);

  const handleCreateEvent = async (slug: string, name: string, description?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({ slug, name, description, key: writeKey });
        router.push(`/event/${result.slug}?key=${result.adminKey}&new=true`);
      } catch (e: any) {
        setError(e.message || "Une erreur est survenue");
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
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-black/[0.03] space-y-6">
          <div className="mx-auto w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center text-accent">
            <Calendar size={40} />
          </div>
          <div>
            <p className="text-lg font-bold text-text">Aucun événement pour l&apos;instant</p>
            <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">Créez votre premier événement pour commencer à organiser vos fêtes ! 🎁</p>
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
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.slug}`}
              className="block rounded-2xl bg-white p-5 shadow-sm border border-gray-200 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
              {event.description && (
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                <span>/{event.slug}</span>
              </div>
            </Link>
          ))}
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

function EventForm({
  onSubmit,
  onClose,
  isPending,
  error,
}: {
  onSubmit: (slug: string, name: string, description?: string) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // remove special chars
      .trim()
      .replace(/\s+/g, "-") // replace spaces with -
      .replace(/-+/g, "-"); // remove double -
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !name.trim()) return;
    onSubmit(slug.trim().toLowerCase().replace(/\s+/g, "-"), name.trim(), description.trim() || undefined);
  };

  return (
    <BottomSheet open={true} onClose={onClose} title="Nouvel événement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nom de l&apos;événement</span>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-accent transition-colors"
            value={name}
            onChange={(e) => {
              const newName = e.target.value;
              setName(newName);
              if (!isSlugManuallyEdited) {
                setSlug(generateSlug(newName));
              }
            }}
            placeholder="Noël 2024"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Slug (URL personnalisée)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/event/</span>
            <input
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-accent transition-colors"
              value={slug}
              onChange={(e) => {
                setSlug(generateSlug(e.target.value));
                setIsSlugManuallyEdited(true);
              }}
              placeholder="noel-2024"
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          {error && (
            <p className="text-xs font-semibold text-red-500">{error}</p>
          )}
          <p className="text-xs text-gray-500">
            Lien unique pour votre événement
          </p>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Description (optionnel)</span>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Réunion de famille pour Noël"
            rows={3}
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !slug.trim() || !name.trim()}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {isPending ? "Création..." : "Créer"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}




