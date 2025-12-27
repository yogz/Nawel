"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export function MealForm({ meal, onSubmit, onDelete, onClose }: any) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(meal?.date ? new Date(meal.date) : undefined);
  const [title, setTitle] = useState(meal?.title || "");
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
      onSubmit(formattedDate, title);
    } else {
      let servicesToCreate: string[];
      if (quickOption === "custom") {
        servicesToCreate = selectedServices.map(
          (id) => DEFAULT_SERVICE_TYPES.find((m) => m.id === id)?.label || id
        );
      } else {
        servicesToCreate = QUICK_OPTIONS.find((o) => o.id === quickOption)?.services || ["Service"];
      }
      onSubmit(formattedDate, title, servicesToCreate);
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="premium"
              onClick={onClose}
              className="h-12 flex-1 border-gray-100 bg-gray-50/50"
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                Annuler
              </span>
            </Button>
            {isEditMode ? (
              <Button
                type="button"
                variant="premium"
                onClick={handleSubmit}
                disabled={!date}
                className="h-12 flex-[2] pr-6 shadow-md"
                shine
              >
                <span className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Enregistrer
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="premium"
                onClick={() => setStep(2)}
                disabled={!canGoNext()}
                className="h-12 flex-[2] pr-6 shadow-md"
              >
                <span className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Suivant
                </span>
              </Button>
            )}
          </div>

          {isEditMode && onDelete && (
            <div className="pt-2">
              <Button
                type="button"
                variant="premium"
                onClick={() => onDelete(meal.id)}
                className="w-full border-red-100 bg-red-50/30"
                icon={<Trash2 size={14} />}
                iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
              >
                <span className="text-xs font-black uppercase tracking-widest text-red-600">
                  Supprimer ce repas
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Services (creation only) */}
      {step === 2 && !isEditMode && (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Organisation du repas
          </p>

          {/* Quick options */}
          <div className="space-y-3">
            {QUICK_OPTIONS.map((opt) => {
              const isSelected = quickOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuickOption(opt.id)}
                  className={clsx(
                    "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                      : "border-gray-50 bg-white hover:border-gray-200"
                  )}
                >
                  <div
                    className={clsx(
                      "flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all duration-300",
                      isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-gray-100"
                    )}
                  >
                    {opt.emoji}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`block text-xs font-black uppercase tracking-widest ${isSelected ? "text-accent" : "text-gray-700"}`}
                    >
                      {opt.label}
                    </span>
                    {opt.services.length > 0 && (
                      <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
                        {opt.services.join(" • ")}
                      </span>
                    )}
                  </div>
                  <div
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                      isSelected ? "border-accent bg-accent" : "border-gray-200 bg-white"
                    )}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom service selection */}
          {quickOption === "custom" && (
            <div className="space-y-3 pt-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Sélectionnez les services
              </Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SERVICE_TYPES.map((type) => {
                  const isSelected = selectedServices.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleService(type.id)}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all active:scale-95",
                        isSelected
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-gray-50 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <div
                        className={clsx(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all",
                          isSelected
                            ? "bg-accent text-white shadow-md shadow-accent/20"
                            : "bg-gray-100"
                        )}
                      >
                        {type.emoji}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="premium"
              onClick={() => setStep(1)}
              className="h-12 flex-1 border-gray-100 bg-gray-50/50"
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                Retour
              </span>
            </Button>
            <Button
              type="button"
              variant="premium"
              onClick={handleSubmit}
              disabled={quickOption === "custom" && selectedServices.length === 0}
              className="h-12 flex-[2] pr-6 shadow-md"
              shine
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-700">
                Créer l&apos;événement
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
