"use client";

import { useState, useTransition } from "react";
import {
  createCostAction,
  deleteCostAction,
  toggleCostActiveAction,
} from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Calendar as CalendarIcon, Pause, Play, Repeat } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Cost {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: Date;
  frequency: "once" | "monthly" | "yearly";
  isActive: boolean;
  stoppedAt: Date | null;
}

export function AdminCostList({ initialCosts }: { initialCosts: Cost[] }) {
  const [costs, setCosts] = useState(initialCosts);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const dateStr = formData.get("date") as string;
    const frequency = formData.get("frequency") as "once" | "monthly" | "yearly";
    const date = dateStr ? new Date(dateStr) : new Date();

    startTransition(async () => {
      const result = await createCostAction({
        amount,
        category,
        description,
        date,
        frequency,
      });

      if (result.success) {
        toast.success("Coût ajouté !");
        window.location.reload();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce coût ?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCostAction({ id });
      if (result.success) {
        setCosts((prev) => prev.filter((c) => c.id !== id));
        toast.success("Coût supprimé");
      }
    });
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    const action = currentActive ? "arrêter" : "redémarrer";
    if (!confirm(`Voulez-vous ${action} ce coût récurrent ?`)) {
      return;
    }

    startTransition(async () => {
      const result = await toggleCostActiveAction({ id, isActive: !currentActive });
      if (result.success) {
        toast.success(`Coût ${currentActive ? "arrêté" : "redémarré"}`);
        window.location.reload();
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-8">
      {/* Formulaire d'ajout */}
      <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-primary" />
          Ajouter un coût
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select name="category" required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosting">Hébergement</SelectItem>
                  <SelectItem value="domain">Domaines</SelectItem>
                  <SelectItem value="ai">Services IA</SelectItem>
                  <SelectItem value="email">E-mails</SelectItem>
                  <SelectItem value="dev">Développement</SelectItem>
                  <SelectItem value="services">Services tiers</SelectItem>
                  <SelectItem value="database">Base de données</SelectItem>
                  <SelectItem value="api">Services API</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date de début</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence</Label>
              <Select name="frequency" defaultValue="once">
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Une fois</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="description">Description (facultatif)</Label>
              <Input id="description" name="description" placeholder="ex: Vercel Pro Plan" />
            </div>
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={isPending} className="w-full lg:w-auto">
                {isPending ? "Ajout..." : "Ajouter le coût"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Liste des coûts */}
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-black/5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Catégorie / Freq</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {costs.map((cost) => (
                <tr
                  key={cost.id}
                  className={cn(
                    "transition-colors hover:bg-black/5",
                    !cost.isActive && "bg-black/[0.02] opacity-60"
                  )}
                >
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDate(cost.date)}
                      </div>
                      {!cost.isActive && cost.stoppedAt && (
                        <div className="text-[10px] font-bold uppercase text-red-500">
                          Arrêté le {formatDate(cost.stoppedAt)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {cost.category}
                      </span>
                      {cost.frequency !== "once" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                          <Repeat className="h-3 w-3" />
                          {cost.frequency === "monthly" ? "Mensuel" : "Annuel"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-text/80 px-6 py-4 text-sm font-medium">
                    {cost.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-text">{cost.amount.toFixed(2)} €</span>
                      {cost.frequency !== "once" && (
                        <span className="text-[10px] italic text-muted-foreground">
                          par {cost.frequency === "monthly" ? "mois" : "an"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {cost.frequency !== "once" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(cost.id, cost.isActive)}
                          className={cn(
                            "h-8 w-8 p-0",
                            cost.isActive
                              ? "text-orange-500 hover:bg-orange-50"
                              : "text-green-500 hover:bg-green-50"
                          )}
                          title={cost.isActive ? "Arrêter" : "Redémarrer"}
                        >
                          {cost.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cost.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {costs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun coût enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
