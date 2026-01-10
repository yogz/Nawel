"use client";

import { useState, useTransition } from "react";
import { createCostAction, deleteCostAction } from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface Cost {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: Date;
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
    const date = dateStr ? new Date(dateStr) : new Date();

    startTransition(async () => {
      const result = await createCostAction({
        amount,
        category,
        description,
        date,
      });

      if (result.success) {
        toast.success("Coût ajouté !");
        // We re-fetch or reload to get the new ID, but for UI responsiveness:
        window.location.reload();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce coût ?")) return;

    startTransition(async () => {
      const result = await deleteCostAction({ id });
      if (result.success) {
        setCosts((prev) => prev.filter((c) => c.id !== id));
        toast.success("Coût supprimé");
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
        <form
          onSubmit={handleSubmit}
          className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input id="category" name="category" placeholder="ex: hosting, domain, api" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="ex: Vercel Pro Plan" />
          </div>
          <div className="flex justify-end lg:col-span-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Ajout..." : "Ajouter le coût"}
            </Button>
          </div>
        </form>
      </div>

      {/* Liste des coûts */}
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-sm">
        <table className="w-full border-collapse text-left">
          <thead className="bg-black/5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Catégorie</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Montant</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {costs.map((cost) => (
              <tr key={cost.id} className="transition-colors hover:bg-black/5">
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    {formatDate(cost.date)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {cost.category}
                  </span>
                </td>
                <td className="text-text/80 px-6 py-4 text-sm">{cost.description || "-"}</td>
                <td className="px-6 py-4 text-right font-semibold text-text">
                  {cost.amount.toFixed(2)} €
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cost.id)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
  );
}
