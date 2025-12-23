"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DEFAULT_MEAL_TYPES = [
    { id: "apero", label: "Apéro" },
    { id: "entree", label: "Entrée" },
    { id: "plat", label: "Plat" },
    { id: "fromage", label: "Fromage" },
    { id: "dessert", label: "Dessert" },
    { id: "boisson", label: "Boissons" },
    { id: "autre", label: "Autre" },
];

const PRECISION_OPTIONS = [
    { value: "matin", label: "Matin" },
    { value: "midi", label: "Midi" },
    { value: "soir", label: "Soir" },
];

export function DayForm({ day, onSubmit, onDelete, onClose }: any) {
    const [date, setDate] = useState<Date | undefined>(day?.date ? new Date(day.date) : undefined);
    const [title, setTitle] = useState(day?.title || "");
    const [precision, setPrecision] = useState("");
    const [hour, setHour] = useState("");
    const [selectedMeals, setSelectedMeals] = useState<string[]>(["plat"]);
    const [combineMeals, setCombineMeals] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!date) return;

        // On envoie le format YYYY-MM-DD
        const formattedDate = format(date, "yyyy-MM-dd");

        if (day) {
            onSubmit(formattedDate, title);
        } else {
            let finalTitle = title;
            const precisionPart = hour ? hour : precision;
            if (precisionPart) {
                finalTitle = finalTitle ? `${finalTitle} (${precisionPart})` : precisionPart.charAt(0).toUpperCase() + precisionPart.slice(1);
            }

            const mealsToCreate = combineMeals ? ["Repas"] : selectedMeals.map(id => DEFAULT_MEAL_TYPES.find(m => m.id === id)?.label || id);
            onSubmit(formattedDate, finalTitle, mealsToCreate);
        }
    };

    const toggleMeal = (id: string) => {
        setSelectedMeals(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal h-12 rounded-2xl",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                locale={fr}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="title">Nom (optionnel)</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Réveillon"
                        className="rounded-2xl h-12"
                    />
                </div>

                {!day && (
                    <>
                        <div className="space-y-3">
                            <Label>Précision (optionnel)</Label>
                            <div className="flex flex-wrap gap-2">
                                {PRECISION_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPrecision(precision === opt.value ? "" : opt.value)}
                                        className={`px-4 py-2 rounded-xl border text-sm transition-all ${precision === opt.value
                                            ? "bg-accent text-white border-accent shadow-sm"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-gray-400">ou heure:</span>
                                    <Input
                                        className="w-20 h-9 rounded-xl"
                                        placeholder="20h"
                                        value={hour}
                                        onChange={(e) => setHour(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <Label>Repas à créer</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {DEFAULT_MEAL_TYPES.map((type) => (
                                    <div
                                        key={type.id}
                                        onClick={() => toggleMeal(type.id)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${selectedMeals.includes(type.id)
                                            ? "bg-accent/5 border-accent text-accent"
                                            : "bg-white border-gray-100 text-gray-600"
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedMeals.includes(type.id) ? "bg-accent border-accent" : "border-gray-300"
                                            }`}>
                                            {selectedMeals.includes(type.id) && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">{type.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 mt-2">
                                <Checkbox
                                    id="combine"
                                    checked={combineMeals}
                                    onCheckedChange={(checked: boolean) => setCombineMeals(!!checked)}
                                />
                                <Label htmlFor="combine" className="text-xs font-medium text-gray-500 leading-tight">
                                    Tout organiser dans le même repas (recommandé pour une organisation simple)
                                </Label>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={!date} className="w-full rounded-2xl bg-accent text-white hover:bg-accent/90 h-12 text-base font-bold shadow-lg shadow-accent/20">
                    {day ? "Mettre à jour" : "Créer le jour"}
                </Button>
                {day && onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete(day.id)}
                        className="w-full rounded-2xl h-11"
                    >
                        Supprimer le jour
                    </Button>
                )}
                <Button type="button" variant="ghost" onClick={onClose} className="w-full rounded-2xl h-11 text-gray-400">
                    Annuler
                </Button>
            </div>
        </form>
    );
}
