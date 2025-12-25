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

  const handleCreateEvent = async (
    slug: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string
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
        });
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
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.slug}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
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

const CREATION_MODES = [
  {
    id: "total",
    label: "La totale",
    desc: "Apéro, Entrée, Plat, Fromage, Dessert, Boissons, Autre",
    emoji: "🍽️",
  },
  { id: "classique", label: "Le classique", desc: "Entrée, Plat, Dessert", emoji: "🍴" },
  { id: "apero", label: "L'apéro", desc: "Apéro, Boissons", emoji: "🥂" },
  { id: "zero", label: "De zéro", desc: "Vide", emoji: "📝" },
] as const;

function EventForm({
  onSubmit,
  onClose,
  isPending,
  error,
}: {
  onSubmit: (
    slug: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string
  ) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creationMode, setCreationMode] = useState<"total" | "classique" | "apero" | "zero">(
    "total"
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [customPassword, setCustomPassword] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleSubmit = () => {
    if (!slug.trim() || !name.trim()) return;
    onSubmit(
      slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name.trim(),
      description.trim() || undefined,
      creationMode,
      date,
      customPassword.trim() || undefined
    );
  };

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0 && date.length > 0;
    if (step === 2) return true;
    return true;
  };

  const goNext = () => {
    if (step < 3 && canGoNext()) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedMode = CREATION_MODES.find((m) => m.id === creationMode);

  const stepTitles = ["Votre événement", "Type de menu", "Confirmation"];

  return (
    <BottomSheet open={true} onClose={onClose} title={stepTitles[step - 1]}>
      {/* Progress indicator */}
      <div className="mb-6 flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              s <= step ? "bg-accent" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Name & Date */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-gray-900">Nom de l&apos;événement</span>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                if (!isSlugManuallyEdited) {
                  setSlug(generateSlug(newName));
                }
              }}
              placeholder="Noël en Famille 2024"
              autoFocus
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-gray-900">Date</span>
            <input
              type="date"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Creation Mode */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Choisissez les catégories de départ</p>

          <div className="space-y-2">
            {CREATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCreationMode(mode.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  creationMode === mode.id
                    ? "border-accent bg-accent/5"
                    : "border-gray-100 bg-white"
                }`}
              >
                <span className="text-2xl">{mode.emoji}</span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-bold ${creationMode === mode.id ? "text-accent" : "text-gray-700"}`}
                  >
                    {mode.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{mode.desc}</span>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    creationMode === mode.id ? "border-accent bg-accent" : "border-gray-300"
                  }`}
                >
                  {creationMode === mode.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Événement</span>
              <span className="text-sm font-bold text-gray-900">{name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Date</span>
              <span className="text-sm font-medium text-gray-700">
                {new Date(date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Menu</span>
              <span className="text-sm font-medium text-gray-700">
                {selectedMode?.emoji} {selectedMode?.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">URL</span>
              <span className="font-mono text-sm text-accent">/{slug}</span>
            </div>
          </div>

          {/* Advanced options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            {showAdvanced ? "↑ Masquer les options" : "↓ Options avancées"}
          </button>

          {showAdvanced && (
            <div className="space-y-3 border-t border-gray-100 pt-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">URL personnalisée</span>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value));
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="nom-de-levenement"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">Clé admin (optionnel)</span>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="mon-code-secret"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">Description (optionnel)</span>
                <textarea
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Une petite description..."
                  rows={2}
                />
              </label>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !slug.trim() || !name.trim()}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              {isPending ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
