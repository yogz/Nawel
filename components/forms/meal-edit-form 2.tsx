"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function MealEditForm({ meal, onSubmit, onDelete, onClose }: any) {
    const [title, setTitle] = useState(meal?.title || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(meal.id, title);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="meal-title">Nom du repas</Label>
                <Input
                    id="meal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Dîner, Apéro..."
                    required
                    autoFocus
                />
            </div>

            <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full rounded-2xl bg-accent text-white hover:bg-accent/90">
                    Mettre à jour
                </Button>
                {onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete(meal.id)}
                        className="w-full rounded-2xl"
                    >
                        Supprimer le repas
                    </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose} className="w-full rounded-2xl">
                    Annuler
                </Button>
            </div>
        </form>
    );
}
