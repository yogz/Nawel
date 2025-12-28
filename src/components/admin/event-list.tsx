"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
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
  Baby,
  User,
} from "lucide-react";

export function EventList({ initialEvents }: { initialEvents: EventWithStats[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const getEditUrl = (event: EventWithStats) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return event.adminKey ? `/event/${event.slug}?key=${event.adminKey}` : `/event/${event.slug}`;
  };

  const copyToClipboard = async (event: EventWithStats) => {
    const url = getEditUrl(event);
    await navigator.clipboard.writeText(url);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) {
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const slug = formData.get("slug") as string;
    const adminKey = formData.get("adminKey") as string;
    const adults = parseInt(formData.get("adults") as string) || 0;
    const children = parseInt(formData.get("children") as string) || 0;

    startTransition(async () => {
      try {
        await updateEventAdminAction({
          id: editingEvent.id,
          name,
          description: description || null,
          slug: slug || undefined,
          adminKey: adminKey || null,
          adults,
          children,
        });

        setEvents((prev) =>
          prev.map((event) =>
            event.id === editingEvent.id
              ? {
                  ...event,
                  name,
                  description: description || null,
                  slug: slug || event.slug,
                  adminKey: adminKey || null,
                  adults,
                  children,
                }
              : event
          )
        );
        setEditingEvent(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingEvent) {
      return;
    }

    startTransition(async () => {
      await deleteEventAdminAction({ id: deletingEvent.id });
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
      <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
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
            className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-text">{event.name}</h3>
                  <Link
                    href={`/event/${event.slug}`}
                    target="_blank"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  /{event.slug} &middot; Créé le {formatDate(event.createdAt)}
                  {event.owner && (
                    <>
                      {" "}
                      &middot; Par{" "}
                      <span className="text-text/90 font-medium" title={event.owner.email}>
                        {event.owner.name}
                      </span>
                    </>
                  )}
                </p>

                {/* URL d'édition */}
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-black/5 p-2">
                  <code className="text-text/70 flex-1 truncate font-mono text-xs">
                    {getEditUrl(event)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(event)}
                    className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/10"
                    title="Copier l'URL"
                  >
                    {copiedId === event.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <Link
                    href={getEditUrl(event)}
                    target="_blank"
                    className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/10"
                    title="Ouvrir en mode édition"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>

                {event.description && (
                  <p className="text-text/80 mb-3 line-clamp-2 text-sm">{event.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {event.adults} adulte{event.adults > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Baby className="h-4 w-4" />
                    {event.children} enfant{event.children > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {event.mealsCount} repas
                  </span>
                  <span className="flex items-center gap-1">
                    <Utensils className="h-4 w-4" />
                    {event.servicesCount} service{event.servicesCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event.peopleCount} convive{event.peopleCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {event.itemsCount} article{event.itemsCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 sm:flex-col">
                <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeletingEvent(event)}>
                  <Trash2 className="h-4 w-4 sm:mr-2" />
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
            <Label htmlFor="slug">Slug (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/event/</span>
              <Input
                id="slug"
                name="slug"
                defaultValue={editingEvent?.slug}
                required
                disabled={isPending}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editingEvent?.description || ""}
              rows={2}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults">Adultes</Label>
              <Input
                id="adults"
                name="adults"
                type="number"
                min="0"
                max="1000"
                defaultValue={editingEvent?.adults ?? 0}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="children">Enfants</Label>
              <Input
                id="children"
                name="children"
                type="number"
                min="0"
                max="1000"
                defaultValue={editingEvent?.children ?? 0}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminKey">Clé Admin</Label>
            <Input
              id="adminKey"
              name="adminKey"
              defaultValue={editingEvent?.adminKey || ""}
              disabled={isPending}
              placeholder="Laisser vide pour aucune clé"
            />
            <p className="text-xs text-muted-foreground">
              Utilisée pour accéder en mode édition via ?key=...
            </p>
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
            <strong className="text-text">{deletingEvent?.name}</strong> ? Cette action est
            irréversible et supprimera tous les repas, services, articles et convives associés.
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
