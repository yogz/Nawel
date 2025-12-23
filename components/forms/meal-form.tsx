"use client";

import { useState } from "react";
import { Day } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import clsx from "clsx";

export function MealForm({
    days,
    defaultDayId,
    forceNewDay,
    onSubmit,
    readOnly,
}: {
    days: Day[];
    defaultDayId?: number;
    forceNewDay?: boolean;
    onSubmit: (dayId: number, title: string, newDayDate?: string, newDayTitle?: string) => Promise<void>;
    readOnly?: boolean;
}) {
    const [dayId, setDayId] = useState<string>(defaultDayId ? String(defaultDayId) : (forceNewDay ? "new" : (days[0]?.id ? String(days[0].id) : "new")));
    const [title, setTitle] = useState("");
    const [newDayDate, setNewDayDate] = useState("");
    const [newDayTitle, setNewDayTitle] = useState("");

    const handleSubmit = async () => {
        if (dayId === "new") {
            await onSubmit(-1, title, newDayDate, newDayTitle);
        } else {
            await onSubmit(Number(dayId), title);
        }
    };

    return (
        <div className="space-y-6">
            {!forceNewDay && days.length > 0 && (
                <div className="space-y-2">
                    <Label>Choisir le jour</Label>
                    <Select value={dayId} onValueChange={setDayId} disabled={readOnly}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un jour" />
                        </SelectTrigger>
                        <SelectContent>
                            {days.map((day) => (
                                <SelectItem key={day.id} value={String(day.id)}>
                                    {day.title || day.date}
                                </SelectItem>
                            ))}
                            <SelectItem value="new">+ Nouveau jour</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {(dayId === "new" || forceNewDay) && (
                <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Nouveau jour</p>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={newDayDate}
                            onChange={(e) => setNewDayDate(e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="day-title">Titre (optionnel)</Label>
                        <Input
                            id="day-title"
                            placeholder="Ex: Réveillon, Jour J..."
                            value={newDayTitle}
                            onChange={(e) => setNewDayTitle(e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="meal-title">Nom du repas</Label>
                <Input
                    id="meal-title"
                    placeholder="Ex: Dîner, Apéro, Petit-déj..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={readOnly}
                    autoFocus
                />
            </div>

            <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={readOnly || !title.trim() || ((dayId === "new" || forceNewDay) && !newDayDate)}
            >
                Ajouter le repas
            </Button>
        </div>
    );
}
