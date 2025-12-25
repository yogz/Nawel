"use client";

import { useState } from "react";
import { Day } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
    onSubmit: (dayId: number, title: string, peopleCount: number, newDayDate?: string, newDayTitle?: string) => Promise<void>;
    readOnly?: boolean;
}) {
    const [dayId, setDayId] = useState<string>(
        defaultDayId !== undefined && defaultDayId !== -1
            ? String(defaultDayId)
            : (forceNewDay || days.length === 0 ? "new" : String(days[0].id))
    );
    const [title, setTitle] = useState("");
    const [peopleCount, setPeopleCount] = useState(1);
    const [newDayDate, setNewDayDate] = useState<Date | undefined>(undefined);
    const [newDayTitle, setNewDayTitle] = useState("");

    const handleSubmit = async () => {
        if (dayId === "new") {
            if (!newDayDate) return;
            const formattedDate = format(newDayDate, "yyyy-MM-dd");
            await onSubmit(-1, title, peopleCount, formattedDate, newDayTitle);
        } else {
            await onSubmit(Number(dayId), title, peopleCount);
        }
    };

    return (
        <div className="space-y-6">
            {!forceNewDay && days.length > 0 && (
                <div className="space-y-2">
                    <Label>Choisir le repas</Label>
                    <Select value={dayId} onValueChange={setDayId} disabled={readOnly}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un repas" />
                        </SelectTrigger>
                        <SelectContent>
                            {days.map((day) => (
                                <SelectItem key={day.id} value={String(day.id)}>
                                    {day.title || day.date}
                                </SelectItem>
                            ))}
                            <SelectItem value="new">+ Nouveau repas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {(dayId === "new" || forceNewDay) && (
                <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Nouveau repas</p>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-12 rounded-2xl",
                                        !newDayDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newDayDate ? format(newDayDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={newDayDate}
                                    onSelect={setNewDayDate}
                                    initialFocus
                                    locale={fr}
                                />
                            </PopoverContent>
                        </Popover>
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
                <Label htmlFor="meal-title">Nom du service</Label>
                <Input
                    id="meal-title"
                    placeholder="Ex: Dîner, Apéro, Petit-déj..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={readOnly}
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="people-count">Nombre de personnes</Label>
                <Input
                    id="people-count"
                    type="number"
                    min="1"
                    placeholder="Ex: 8"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                    disabled={readOnly}
                />
            </div>

            <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={readOnly || !title.trim() || ((dayId === "new" || forceNewDay) && !newDayDate)}
            >
                Ajouter le service
            </Button>
        </div>
    );
}
