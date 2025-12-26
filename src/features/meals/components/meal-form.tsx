"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { type Meal } from "@/lib/types";

const DEFAULT_SERVICE_TYPES = [
  { id: "apero", label: "Apéro", emoji: "🥂" },
  { id: "entree", label: "Entrée", emoji: "🥗" },
  { id: "plat", label: "Plat", emoji: "🍽️" },
  { id: "fromage", label: "Fromage", emoji: "🧀" },
  { id: "dessert", label: "Dessert", emoji: "🍰" },
  { id: "boisson", label: "Boissons", emoji: "🍷" },
  { id: "autre", label: "Autre", emoji: "📦" },
];

const QUICK_OPTIONS = [
  { id: "simple", label: "Un seul service", emoji: "🍴", services: ["Service"] },
  { id: "complet", label: "Menu complet", emoji: "🍽️", services: ["Entrée", "Plat", "Dessert"] },
  { id: "custom", label: "Personnalisé", emoji: "✨", services: [] },
];

export function MealForm({
  meal,
  defaultAdults = 0,
  defaultChildren = 0,
  onSubmit,
  onDelete,
  onClose,
}: {
  meal?: Meal;
  defaultAdults?: number;
  defaultChildren?: number;
  onSubmit: (
    date: string,
    title: string,
    services?: string[],
    adults?: number,
    children?: number
  ) => void;
  onDelete?: (meal: Meal) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(meal?.date ? new Date(meal.date) : undefined);
  const [title, setTitle] = useState(meal?.title || "");
  const [adults, setAdults] = useState(meal?.adults ?? defaultAdults);
  const [children, setChildren] = useState(meal?.children ?? defaultChildren);
  const [quickOption, setQuickOption] = useState<string>("simple");
  const [selectedServices, setSelectedServices] = useState<string[]>(["plat"]);

  const isEditMode = !!meal;
  // totalSteps reserved for future wizard UI
  const _totalSteps = isEditMode ? 1 : 2;

  const handleSubmit = () => {
    if (!date) {
      return;
    }
    const formattedDate = format(date, "yyyy-MM-dd");

    if (isEditMode) {
      onSubmit(formattedDate, title, undefined, adults, children);
    } else {
      let servicesToCreate: string[];
      if (quickOption === "custom") {
        servicesToCreate = selectedServices.map(
          (id) => DEFAULT_SERVICE_TYPES.find((m) => m.id === id)?.label || id
        );
      } else {
        servicesToCreate = QUICK_OPTIONS.find((o) => o.id === quickOption)?.services || ["Service"];
      }
      onSubmit(formattedDate, title, servicesToCreate, adults, children);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const canGoNext = () => {
    if (step === 1) {
      return !!date;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      {!isEditMode && (
        <div className="mb-2 flex gap-1.5">
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
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults">Adultes</Label>
              <Input
                id="adults"
                type="number"
                min="0"
                value={adults}
                onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="children">Enfants</Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl"
            >
              Annuler
            </Button>
            {isEditMode ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!date}
                className="h-12 flex-[2] rounded-2xl bg-accent"
              >
                Enregistrer
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canGoNext()}
                className="h-12 flex-[2] rounded-2xl bg-accent"
              >
                Suivant
              </Button>
            )}
          </div>

          {isEditMode && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(meal)}
              className="h-11 w-full rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600"
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
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  quickOption === opt.id ? "border-accent bg-accent/5" : "border-gray-100 bg-white"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div className="flex-1">
                  <span
                    className={`block text-sm font-bold ${quickOption === opt.id ? "text-accent" : "text-gray-700"}`}
                  >
                    {opt.label}
                  </span>
                  {opt.services.length > 0 && (
                    <span className="block text-xs text-gray-500">{opt.services.join(", ")}</span>
                  )}
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    quickOption === opt.id ? "border-accent bg-accent" : "border-gray-300"
                  }`}
                >
                  {quickOption === opt.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          {/* Custom service selection */}
          {quickOption === "custom" && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-gray-400">Sélectionnez les services</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SERVICE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleService(type.id)}
                    className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm transition-all ${
                      selectedServices.includes(type.id)
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
              className="h-12 flex-1 rounded-2xl"
            >
              Retour
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={quickOption === "custom" && selectedServices.length === 0}
              className="h-12 flex-[2] rounded-2xl bg-accent"
            >
              Créer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
