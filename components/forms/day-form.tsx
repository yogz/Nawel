"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function DayForm({ day, onSubmit, onDelete, onClose }: any) {
    const [date, setDate] = useState(day?.date || "");
    const [title, setTitle] = useState(day?.title || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(date, title);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="date">Date (ex: 24/12)</Label>
                    <Input
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        placeholder="24/12"
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="title">Nom (optionnel)</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Réveillon"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full rounded-2xl bg-accent text-white hover:bg-accent/90">
                    {day ? "Mettre à jour" : "Créer le jour"}
                </Button>
                {day && onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete(day.id)}
                        className="w-full rounded-2xl"
                    >
                        Supprimer le jour
                    </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose} className="w-full rounded-2xl">
                    Annuler
                </Button>
            </div>
        </form>
    );
}
