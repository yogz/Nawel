"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  type EventWithStats,
  updateEventAdminAction,
  deleteEventAdminAction,
} from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Calendar,
  Users,
  Utensils,
  Package,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

export function EventList({
  initialEvents,
}: {
  initialEvents: EventWithStats[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const getEditUrl = (event: EventWithStats) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return event.adminKey
      ? `${baseUrl}/event/${event.slug}?key=${event.adminKey}`
      : `${baseUrl}/event/${event.slug}`;
  };

  const copyToClipboard = async (event: EventWithStats) => {
    const url = getEditUrl(event);
    await navigator.clipboard.writeText(url);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    startTransition(async () => {
      await updateEventAdminAction({
        id: editingEvent.id,
        name,
        description: description || null,
      });

      setEvents((prev) =>
        prev.map((event) =>
          event.id === editingEvent.id
            ? { ...event, name, description: description || null }
            : event
        )
      );
      setEditingEvent(null);
    });
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;

    startTransition(async () => {
      await deleteEventAdminAction(deletingEvent.id);
      setEvents((prev) => prev.filter((event) => event.id !== deletingEvent.id));
      setDeletingEvent(null);
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  if (events.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20 text-center">
        <p className="text-muted-foreground">Aucun événement pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-white/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg text-text truncate">
                    {event.name}
                  </h3>
                  <Link
                    href={`/event/${event.slug}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  /{event.slug} &middot; Créé le {formatDate(event.createdAt)}
                </p>

                {/* URL d'édition */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-black/5 rounded-lg">
                  <code className="text-xs text-text/70 truncate flex-1 font-mono">
                    {getEditUrl(event)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(event)}
                    className="p-1.5 hover:bg-black/10 rounded-md transition-colors shrink-0"
                    title="Copier l'URL"
                  >
                    {copiedId === event.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <Link
                    href={getEditUrl(event)}
                    target="_blank"
                    className="p-1.5 hover:bg-black/10 rounded-md transition-colors shrink-0"
                    title="Ouvrir en mode édition"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </div>

                {event.description && (
                  <p className="text-sm text-text/80 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {event.mealsCount} repas
                  </span>
                  <span className="flex items-center gap-1">
                    <Utensils className="w-4 h-4" />
                    {event.servicesCount} service{event.servicesCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.peopleCount} convive{event.peopleCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {event.itemsCount} article{event.itemsCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 sm:flex-col">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingEvent(event)}
                >
                  <Pencil className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingEvent(event)}
                >
                  <Trash2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <BottomSheet
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Modifier l'événement"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingEvent?.name}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editingEvent?.description || ""}
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditingEvent(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <BottomSheet
        open={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        title="Supprimer l'événement"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer{" "}
            <strong className="text-text">{deletingEvent?.name}</strong> ? Cette
            action est irréversible et supprimera tous les repas, services,
            articles et convives associés.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDeletingEvent(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
