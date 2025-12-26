"use client";

import { useState, useTransition, useCallback } from "react";
import {
  type CacheEntry,
  getAllCacheEntriesAction,
  deleteCacheEntryAction,
  updateCacheEntryAction,
  clearAllCacheAction,
} from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Search, Eye, Pencil, Trash2, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { AI_CACHE_MIN_CONFIRMATIONS } from "@/lib/constants";

type ParsedIngredient = {
  name: string;
  quantity?: string;
};

export function CacheList({ initialEntries }: { initialEntries: CacheEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<CacheEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<CacheEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CacheEntry | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);

  const parseIngredients = (json: string): ParsedIngredient[] => {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await getAllCacheEntriesAction(searchQuery);
      setEntries(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    startTransition(async () => {
      await deleteCacheEntryAction({ id: deletingEntry.id });
      setEntries((prev) => prev.filter((entry) => entry.id !== deletingEntry.id));
      setDeletingEntry(null);
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;

    const formData = new FormData(e.currentTarget);
    const ingredients = formData.get("ingredients") as string;

    // Validate JSON
    try {
      JSON.parse(ingredients);
    } catch {
      alert("Format JSON invalide");
      return;
    }

    startTransition(async () => {
      try {
        await updateCacheEntryAction({
          id: editingEntry.id,
          ingredients,
        });

        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === editingEntry.id ? { ...entry, ingredients, updatedAt: new Date() } : entry
          )
        );
        setEditingEntry(null);
      } catch (error) {
        console.error("Update failed:", error);
        alert("Échec de la mise à jour");
      }
    });
  };

  const handleClearAll = async () => {
    startTransition(async () => {
      await clearAllCacheAction();
      setEntries([]);
      setShowClearAll(false);
    });
  };

  if (entries.length === 0 && !searchQuery) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
        <p className="text-muted-foreground">Aucune recette en cache pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      {/* Search and Clear All */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isSearching}>
            {isSearching ? "..." : "Rechercher"}
          </Button>
        </form>

        {entries.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowClearAll(true)}
            className="shrink-0"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Vider le cache
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {entries.length} entrée{entries.length > 1 ? "s" : ""} en cache
      </p>

      {/* Cache entries grid */}
      <div className="grid gap-4">
        {entries.map((entry) => {
          const ingredients = parseIngredients(entry.ingredients);
          const isTrusted = entry.confirmations >= AI_CACHE_MIN_CONFIRMATIONS;

          return (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold capitalize text-text">
                      {entry.dishName}
                    </h3>
                    {isTrusted ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Validé
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        En attente
                      </span>
                    )}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {entry.peopleCount} personne{entry.peopleCount > 1 ? "s" : ""}
                    </span>
                    <span>
                      {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""}
                    </span>
                    <span>
                      {entry.confirmations} confirmation{entry.confirmations > 1 ? "s" : ""}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Mis à jour le {formatDate(entry.updatedAt)}
                  </p>
                </div>

                <div className="flex gap-2 sm:flex-col">
                  <Button variant="outline" size="sm" onClick={() => setSelectedEntry(entry)}>
                    <Eye className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Voir</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingEntry(entry)}>
                    <Pencil className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Modifier</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeletingEntry(entry)}>
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && searchQuery && (
        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <p className="text-muted-foreground">Aucun résultat pour &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* View Details Modal */}
      <BottomSheet
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={`Détails : ${selectedEntry?.dishName}`}
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Personnes</span>
                <p className="font-medium">{selectedEntry.peopleCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Confirmations</span>
                <p className="font-medium">{selectedEntry.confirmations}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Ingrédients</h4>
              <div className="max-h-60 overflow-y-auto rounded-lg bg-gray-50 p-3">
                <ul className="space-y-1">
                  {parseIngredients(selectedEntry.ingredients).map((ing, idx) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span>{ing.name}</span>
                      {ing.quantity && (
                        <span className="text-muted-foreground">{ing.quantity}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Créé le {formatDate(selectedEntry.createdAt)}</p>
              <p>Mis à jour le {formatDate(selectedEntry.updatedAt)}</p>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title={`Modifier : ${editingEntry?.dishName}`}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingrédients (JSON)</Label>
            <Textarea
              id="ingredients"
              name="ingredients"
              defaultValue={
                editingEntry
                  ? JSON.stringify(parseIngredients(editingEntry.ingredients), null, 2)
                  : ""
              }
              rows={10}
              className="font-mono text-sm"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Format: [{`{"name": "...", "quantity": "..."}`}, ...]
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditingEntry(null)}
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
        open={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        title="Supprimer l'entrée"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer le cache pour{" "}
            <strong className="capitalize text-text">{deletingEntry?.dishName}</strong> (
            {deletingEntry?.peopleCount} personnes) ?
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDeletingEntry(null)}
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

      {/* Clear All Confirmation Modal */}
      <BottomSheet
        open={showClearAll}
        onClose={() => setShowClearAll(false)}
        title="Vider tout le cache"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer{" "}
            <strong className="text-text">toutes les {entries.length} entrées</strong> du cache ?
            Cette action est irréversible.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowClearAll(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleClearAll}
              disabled={isPending}
            >
              {isPending ? "Suppression..." : "Tout supprimer"}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
