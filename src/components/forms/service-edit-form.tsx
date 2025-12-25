"use client";

import { useState } from "react";
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

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          className="w-full rounded-2xl bg-accent text-white hover:bg-accent/90"
        >
          Mettre à jour
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(service.id)}
            className="w-full rounded-2xl"
          >
            Supprimer le service
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose} className="w-full rounded-2xl">
          Annuler
        </Button>
      </div>
    </form>
  );
}
