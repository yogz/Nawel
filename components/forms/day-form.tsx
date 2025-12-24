"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DEFAULT_MEAL_TYPES = [
    { id: "apero", label: "Apéro", emoji: "🥂" },
    { id: "entree", label: "Entrée", emoji: "🥗" },
    { id: "plat", label: "Plat", emoji: "🍽️" },
    { id: "fromage", label: "Fromage", emoji: "🧀" },
    { id: "dessert", label: "Dessert", emoji: "🍰" },
    { id: "boisson", label: "Boissons", emoji: "🍷" },
    { id: "autre", label: "Autre", emoji: "📦" },
];

const QUICK_OPTIONS = [
    { id: "simple", label: "Un seul service", emoji: "🍴", meals: ["Service"] },
    { id: "complet", label: "Menu complet", emoji: "🍽️", meals: ["Entrée", "Plat", "Dessert"] },
    { id: "custom", label: "Personnalisé", emoji: "✨", meals: [] },
];

export function DayForm({ day, onSubmit, onDelete, onClose }: any) {
    const [step, setStep] = useState(1);
    const [date, setDate] = useState<Date | undefined>(day?.date ? new Date(day.date) : undefined);
    const [title, setTitle] = useState(day?.title || "");
    const [quickOption, setQuickOption] = useState<string>("simple");
    const [selectedMeals, setSelectedMeals] = useState<string[]>(["plat"]);

    const isEditMode = !!day;
    const totalSteps = isEditMode ? 1 : 2;

    const handleSubmit = () => {
        if (!date) return;
        const formattedDate = format(date, "yyyy-MM-dd");

        if (isEditMode) {
            onSubmit(formattedDate, title);
        } else {
            let mealsToCreate: string[];
            if (quickOption === "custom") {
                mealsToCreate = selectedMeals.map(id => DEFAULT_MEAL_TYPES.find(m => m.id === id)?.label || id);
            } else {
                mealsToCreate = QUICK_OPTIONS.find(o => o.id === quickOption)?.meals || ["Service"];
            }
            onSubmit(formattedDate, title, mealsToCreate);
        }
    };

    const toggleMeal = (id: string) => {
        setSelectedMeals(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const canGoNext = () => {
        if (step === 1) return !!date;
        return true;
    };

    return (
        <div className="space-y-4">
            {/* Progress */}
            {!isEditMode && (
                <div className="flex gap-1.5 mb-2">
                    {[1, 2].map((s) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-accent" : "bg-gray-200"}`}
                        />
                    ))}
                </div>
            )}

            {/* Step 1: Date */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={fr}
                            className="rounded-2xl border shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Nom du repas (optionnel)</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Réveillon, Jour de l'an..."
                            className="rounded-2xl h-12"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-2xl h-12"
                        >
                            Annuler
                        </Button>
                        {isEditMode ? (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!date}
                                className="flex-[2] rounded-2xl h-12 bg-accent"
                            >
                                Enregistrer
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={!canGoNext()}
                                className="flex-[2] rounded-2xl h-12 bg-accent"
                            >
                                Suivant
                            </Button>
                        )}
                    </div>

                    {isEditMode && onDelete && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onDelete(day.id)}
                            className="w-full rounded-2xl h-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            Supprimer ce repas
                        </Button>
                    )}
                </div>
            )}

            {/* Step 2: Services (creation only) */}
            {step === 2 && !isEditMode && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Comment organiser ce repas ?</p>

                    {/* Quick options */}
                    <div className="space-y-2">
                        {QUICK_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setQuickOption(opt.id)}
                                className={`w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                                    quickOption === opt.id
                                        ? "border-accent bg-accent/5"
                                        : "border-gray-100 bg-white"
                                }`}
                            >
                                <span className="text-2xl">{opt.emoji}</span>
                                <div className="flex-1">
                                    <span className={`block text-sm font-bold ${quickOption === opt.id ? "text-accent" : "text-gray-700"}`}>
                                        {opt.label}
                                    </span>
                                    {opt.meals.length > 0 && (
                                        <span className="block text-xs text-gray-500">{opt.meals.join(", ")}</span>
                                    )}
                                </div>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                    quickOption === opt.id ? "border-accent bg-accent" : "border-gray-300"
                                }`}>
                                    {quickOption === opt.id && <div className="h-2 w-2 rounded-full bg-white" />}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Custom meal selection */}
                    {quickOption === "custom" && (
                        <div className="space-y-2 pt-2">
                            <Label className="text-xs text-gray-400">Sélectionnez les services</Label>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_MEAL_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => toggleMeal(type.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                                            selectedMeals.includes(type.id)
                                                ? "border-accent bg-accent/10 text-accent"
                                                : "border-gray-100 text-gray-600"
                                        }`}
                                    >
                                        <span>{type.emoji}</span>
                                        <span className="font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="flex-1 rounded-2xl h-12"
                        >
                            Retour
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={quickOption === "custom" && selectedMeals.length === 0}
                            className="flex-[2] rounded-2xl h-12 bg-accent"
                        >
                            Créer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
