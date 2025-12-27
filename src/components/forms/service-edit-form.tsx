"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function ServiceEditForm({ service, onSubmit, onDelete, onClose }: any) {
  const [title, setTitle] = useState(service?.title || "");
  const [peopleCount, setPeopleCount] = useState(service?.peopleCount || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(service.id, title, peopleCount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="service-title">Nom du service</Label>
        <Input
          id="service-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entrée, Plat, Dessert..."
          required
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="people-count">Nombre de personnes</Label>
        <Input
          id="people-count"
          type="number"
          min="1"
          value={peopleCount}
          onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
          placeholder="Ex: 8"
          required
        />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" variant="premium" className="w-full py-6 pr-8 shadow-md" shine>
          <span className="text-sm font-black uppercase tracking-widest text-gray-700">
            Mettre à jour
          </span>
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="premium"
            className="w-full border-red-100 bg-red-50/30"
            icon={<Trash2 size={16} />}
            iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
            onClick={() => onDelete(service.id)}
          >
            <span className="text-xs font-black uppercase tracking-widest text-red-600">
              Supprimer le service
            </span>
          </Button>
        )}
        <Button
          type="button"
          variant="premium"
          onClick={onClose}
          className="w-full border-gray-100 bg-gray-50/50"
        >
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">
            Annuler
          </span>
        </Button>
      </div>
    </form>
  );
}
