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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AdminEventList({ initialEvents }: { initialEvents: EventWithStats[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const filteredEvents = events.filter((event) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) {
      return true;
    }

    return (
      event.name.toLowerCase().includes(searchLower) ||
      event.slug.toLowerCase().includes(searchLower) ||
      event.owner?.name.toLowerCase().includes(searchLower) ||
      event.owner?.email.toLowerCase().includes(searchLower)
    );
  });

  const getEditUrl = (event: EventWithStats) => {
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, slug, propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredEvents.length} résultat{filteredEvents.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-text sm:text-lg">
                      {event.name}
                    </h3>
                    <Link
                      href={`/event/${event.slug}`}
                      target="_blank"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground sm:text-sm">
                    <span className="font-mono">/{event.slug}</span>
                    <span className="mx-1.5">&middot;</span>
                    <span className="hidden sm:inline">Créé le {formatDate(event.createdAt)}</span>
                    <span className="sm:hidden">{formatDate(event.createdAt)}</span>
                    {event.owner && (
                      <>
                        <span className="mx-1.5">&middot;</span>
                        <span className="text-text/90 font-medium" title={event.owner.email}>
                          {event.owner.name}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEvent(event)}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Pencil className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Modifier</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingEvent(event)}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                </div>
              </div>

              {/* URL d'édition */}
              <div className="flex items-center gap-2 rounded-lg bg-black/5 p-2">
                <code className="text-text/70 min-w-0 flex-1 truncate font-mono text-xs">
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
                <p className="text-text/80 line-clamp-2 text-sm">{event.description}</p>
              )}

              {/* Statistiques en grille responsive */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:gap-3 sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>
                    {event.adults} adulte{event.adults > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Baby className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>
                    {event.children} enfant{event.children > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{event.mealsCount} repas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>
                    {event.servicesCount} service{event.servicesCount > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>
                    {event.peopleCount} convive{event.peopleCount > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>
                    {event.itemsCount} article{event.itemsCount > 1 ? "s" : ""}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Drawer open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Modifier l&apos;événement</DrawerTitle>
          </DrawerHeader>
          <div className="scrollbar-none min-h-[60vh] flex-1 overflow-y-auto pb-40">
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
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Drawer open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Supprimer l&apos;événement</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 pb-8">
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
        </DrawerContent>
      </Drawer>
    </>
  );
}
