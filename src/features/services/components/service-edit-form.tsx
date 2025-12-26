"use client";

import { useState } from "react";
import { type Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ServiceEditForm({
  service,
  onSubmit,
  onDelete,
  onClose,
}: {
  service: Service;
  onSubmit: (
    id: number,
    title: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  onDelete: (service: Service) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(service?.title || "");
  const [adults, setAdults] = useState(service?.adults || 0);
  const [children, setChildren] = useState(service?.children || 0);
  const [peopleCount, setPeopleCount] = useState(service?.peopleCount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(service.id, title, adults, children, peopleCount);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-adults">Adultes</Label>
          <Input
            id="edit-adults"
            type="number"
            min="0"
            value={adults}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setAdults(val);
              setPeopleCount(val + children);
            }}
            placeholder="Ex: 5"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-children">Enfants</Label>
          <Input
            id="edit-children"
            type="number"
            min="0"
            value={children}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setChildren(val);
              setPeopleCount(adults + val);
            }}
            placeholder="Ex: 2"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="people-count">Nombre de personnes (Total)</Label>
        <Input
          id="people-count"
          type="number"
          min="0"
          value={peopleCount}
          onChange={(e) => setPeopleCount(parseInt(e.target.value) || 0)}
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
            onClick={() => onDelete(service)}
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
