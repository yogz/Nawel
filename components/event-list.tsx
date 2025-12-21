"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEventAction } from "@/app/actions";
import { Calendar, Plus } from "lucide-react";
import { BottomSheet } from "./ui/bottom-sheet";

type Event = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
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

  const handleCreateEvent = async (slug: string, name: string, description?: string) => {
    if (!writeKey) return;
    startTransition(async () => {
      await createEventAction({ slug, name, description, key: writeKey });
      setShowCreateForm(false);
      window.location.reload();
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
        <div className="rounded-2xl bg-gray-50 p-8 text-center">
          <Calendar className="mx-auto mb-3 text-gray-400" size={48} />
          <p className="text-gray-600">Aucun événement pour l&apos;instant.</p>
          {writeEnabled && (
            <p className="mt-2 text-sm text-gray-500">Créez votre premier événement pour commencer !</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/noel/${event.slug}`}
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
          onClose={() => setShowCreateForm(false)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function EventForm({
  onSubmit,
  onClose,
  isPending,
}: {
  onSubmit: (slug: string, name: string, description?: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) {
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }
            }}
            placeholder="Noël 2024"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Slug (URL)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/noel/</span>
            <input
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
              placeholder="noel-2024"
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          <p className="text-xs text-gray-500">Utilisé dans l&apos;URL (lettres minuscules, chiffres et tirets uniquement)</p>
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


