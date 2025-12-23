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

  const handleCreateEvent = async (slug: string, name: string, description?: string, withDefaultMeals?: boolean, date?: string, key?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({ slug, name, description, key: key || writeKey, withDefaultMeals, date });
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
  onSubmit: (slug: string, name: string, description?: string, withDefaultMeals?: boolean, date?: string, key?: string) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [withDefaultMeals, setWithDefaultMeals] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [passwordMode, setPasswordMode] = useState<"auto" | "manual">("auto");
  const [customPassword, setCustomPassword] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    onSubmit(
      slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name.trim(),
      description.trim() || undefined,
      withDefaultMeals,
      withDefaultMeals ? date : undefined,
      passwordMode === "manual" ? customPassword : undefined
    );
  };

  return (
    <BottomSheet open={true} onClose={onClose} title="Nouvel événement">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Titre de l'événement */}
        <label className="block space-y-2">
          <span className="text-sm font-bold text-gray-900">Nom de l&apos;événement</span>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg outline-none focus:border-accent focus:bg-white transition-all shadow-sm"
            value={name}
            onChange={(e) => {
              const newName = e.target.value;
              setName(newName);
              if (!isSlugManuallyEdited) {
                setSlug(generateSlug(newName));
              }
            }}
            placeholder="Noël en Famille 2024"
            required
            autoFocus
          />
        </label>

        {/* 2. Mot de passe */}
        <div className="space-y-3">
          <span className="text-sm font-bold text-gray-900">Administration (modification)</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPasswordMode("auto")}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all ${passwordMode === "auto"
                ? "border-accent bg-accent/5 ring-4 ring-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${passwordMode === "auto" ? "border-accent bg-accent" : "border-gray-300"}`}>
                  {passwordMode === "auto" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-bold ${passwordMode === "auto" ? "text-accent" : "text-gray-700"}`}>Auto</span>
              </div>
              <span className="text-[10px] text-gray-500">Lien sécurisé généré</span>
            </button>
            <button
              type="button"
              onClick={() => setPasswordMode("manual")}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all ${passwordMode === "manual"
                ? "border-accent bg-accent/5 ring-4 ring-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${passwordMode === "manual" ? "border-accent bg-accent" : "border-gray-300"}`}>
                  {passwordMode === "manual" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-bold ${passwordMode === "manual" ? "text-accent" : "text-gray-700"}`}>Choisi</span>
              </div>
              <span className="text-[10px] text-gray-500">Choisissez votre clé</span>
            </button>
          </div>

          {passwordMode === "manual" && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent transition-all"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Ex: mon-code-secret"
                required={passwordMode === "manual"}
              />
            </div>
          )}
        </div>

        {/* 3. Choix entre création rapide ou de zéro */}
        <div className="space-y-3">
          <span className="text-sm font-bold text-gray-900">Mode de création</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWithDefaultMeals(true)}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all ${withDefaultMeals
                ? "border-accent bg-accent/5 ring-4 ring-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${withDefaultMeals ? "border-accent bg-accent" : "border-gray-300"}`}>
                  {withDefaultMeals && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-bold ${withDefaultMeals ? "text-accent" : "text-gray-700"}`}>Rapide</span>
              </div>
              <span className="text-[10px] text-gray-500">All-in (Apéro, Plat...)</span>
            </button>
            <button
              type="button"
              onClick={() => setWithDefaultMeals(false)}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all ${!withDefaultMeals
                ? "border-accent bg-accent/5 ring-4 ring-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
                }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${!withDefaultMeals ? "border-accent bg-accent" : "border-gray-300"}`}>
                  {!withDefaultMeals && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-bold ${!withDefaultMeals ? "text-accent" : "text-gray-700"}`}>De zéro</span>
              </div>
              <span className="text-[10px] text-gray-500">Vide</span>
            </button>
          </div>

          {withDefaultMeals && (
            <div className="pt-1 animate-in fade-in slide-in-from-top-1">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date du repas</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent bg-white transition-colors"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required={withDefaultMeals}
                />
              </label>
            </div>
          )}
        </div>

        {/* Options avancées (Slug/Description) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showAdvanced ? "↑ Masquer les options" : "↓ Plus d'options (URL, Description)"}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Lien personnalisé (/event/...)</span>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value));
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="nom-de-levenement"
                  pattern="[a-z0-9-]+"
                />
                {error && <p className="text-xs font-semibold text-red-500 mt-1">{error}</p>}
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Description (optionnel)</span>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Une petite description..."
                  rows={2}
                />
              </label>
            </div>
          )}
        </div>

        {/* 4. Bouton Valider */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-4 text-sm font-bold text-gray-600 transition-all active:scale-95"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !slug.trim() || !name.trim() || (passwordMode === "manual" && !customPassword.trim())}
            className="flex-[2] rounded-2xl bg-accent px-4 py-4 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isPending ? "Création en cours..." : "Valider l'événement"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}




