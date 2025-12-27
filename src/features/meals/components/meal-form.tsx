"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { type Meal } from "@/lib/types";
import { Sparkles, ArrowLeft, Check, CalendarIcon, Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";

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

  const handleSubmit = () => {
    if (!date) return;
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
    if (step === 1) return !!date;
    return true;
  };

  return (
    <div className="space-y-4">
      {!isEditMode && (
        <div className="mb-2 flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={clsx(
                "h-1 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-accent shadow-[0_0_8px_rgba(255,107,107,0.4)]" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex justify-center p-1">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={fr}
              className="rounded-[28px] border-none bg-gray-50/50 p-4 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Nom du repas
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Réveillon, Jour de l'an..."
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="adults"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Adultes
              </Label>
              <Input
                id="adults"
                type="number"
                min="0"
                value={adults}
                onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="children"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Enfants
              </Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="premium"
                onClick={onClose}
                className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
              >
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Annuler
                </span>
              </Button>
              {isEditMode ? (
                <Button
                  type="button"
                  variant="premium"
                  onClick={handleSubmit}
                  disabled={!date}
                  className="flex-[2] py-6 pr-8 shadow-md"
                  icon={<Check />}
                  shine
                >
                  <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                    Enregistrer
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="premium"
                  onClick={() => setStep(2)}
                  disabled={!canGoNext()}
                  className="flex-[2] py-6 pr-8 shadow-md"
                  icon={<Sparkles />}
                  shine
                >
                  <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                    Suivant
                  </span>
                </Button>
              )}
            </div>

            {isEditMode && onDelete && (
              <Button
                type="button"
                variant="premium"
                className="w-full border-red-100 bg-red-50/30"
                icon={<Trash2 size={16} />}
                iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                onClick={() => onDelete(meal)}
              >
                <span className="text-xs font-black uppercase tracking-widest text-red-600">
                  Supprimer le repas
                </span>
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 2 && !isEditMode && (
        <div className="space-y-4">
          <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Organisation du repas
          </Label>

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
                      ? "border-accent bg-accent/5 shadow-sm ring-1 ring-accent/20"
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
                      className={clsx(
                        "block text-sm font-black uppercase tracking-widest",
                        isSelected ? "text-accent" : "text-gray-700"
                      )}
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
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isSelected ? "border-accent bg-accent" : "border-gray-200 bg-white"
                    )}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>

          {quickOption === "custom" && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Sélectionnez les services
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEFAULT_SERVICE_TYPES.map((type) => {
                  const isSelected = selectedServices.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleService(type.id)}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border-2 p-2 text-left transition-all active:scale-95",
                        isSelected
                          ? "border-accent bg-accent/5 text-accent shadow-sm"
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
              className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
              icon={<ArrowLeft size={16} />}
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                Retour
              </span>
            </Button>
            <Button
              type="button"
              variant="premium"
              onClick={handleSubmit}
              disabled={quickOption === "custom" && selectedServices.length === 0}
              className="flex-[2] py-6 pr-8 shadow-md"
              icon={<Sparkles />}
              shine
            >
              <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                Créer le repas
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
