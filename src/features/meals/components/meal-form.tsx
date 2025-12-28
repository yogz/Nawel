"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { type Meal } from "@/lib/types";
import {
  Sparkles,
  ArrowLeft,
  Check,
  CalendarIcon,
  Loader2,
  Trash2,
  UtensilsCrossed,
  Salad,
  GlassWater,
  Cake,
  Wine,
  Package,
  CircleDot,
  Plus,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import clsx from "clsx";

const DEFAULT_SERVICE_TYPES = [
  { id: "apero", label: "Apéro", icon: <GlassWater size={20} /> },
  { id: "entree", label: "Entrée", icon: <Salad size={20} /> },
  { id: "plat", label: "Plat", icon: <UtensilsCrossed size={20} /> },
  { id: "fromage", label: "Fromage", icon: <CircleDot size={20} /> },
  { id: "dessert", label: "Dessert", icon: <Cake size={20} /> },
  { id: "boisson", label: "Boissons", icon: <Wine size={20} /> },
  { id: "autre", label: "Autre", icon: <Package size={20} /> },
];

const QUICK_OPTIONS = [
  {
    id: "apero",
    label: "Apéro",
    icon: <GlassWater size={20} />,
    services: ["Boissons", "Apéritif"] as string[],
  },
  { id: "entree", label: "Entrée", icon: <Salad size={20} />, services: ["Entrée"] as string[] },
  {
    id: "plat",
    label: "Plat",
    icon: <UtensilsCrossed size={20} />,
    services: ["Plat"] as string[],
  },
  { id: "dessert", label: "Dessert", icon: <Cake size={20} />, services: ["Dessert"] as string[] },
  {
    id: "fromage",
    label: "Fromage",
    icon: <CircleDot size={20} />,
    services: ["Fromage"] as string[],
  },
  {
    id: "boissons",
    label: "Boissons",
    icon: <Wine size={20} />,
    services: ["Boissons"] as string[],
  },
  { id: "autre", label: "Autre", icon: <Package size={20} />, services: ["Divers"] as string[] },
  { id: "custom", label: "Sur mesure", icon: <Plus size={20} />, services: [] as string[] },
] as const;

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
    children?: number,
    time?: string,
    address?: string
  ) => void;
  onDelete?: (meal: Meal) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(meal?.date ? new Date(meal.date) : undefined);
  const [title, setTitle] = useState(meal?.title || "");
  const [adults, setAdults] = useState(meal?.adults ?? defaultAdults);
  const [children, setChildren] = useState(meal?.children ?? defaultChildren);
  const [time, setTime] = useState(meal?.time || "");
  const [address, setAddress] = useState(meal?.address || "");
  const [quickOption, setQuickOption] = useState<string>("simple");
  const [selectedServices, setSelectedServices] = useState<string[]>(["plat"]);

  const isEditMode = !!meal;

  const handleSubmit = () => {
    if (!date) return;
    const formattedDate = format(date, "yyyy-MM-dd");

    if (isEditMode) {
      onSubmit(formattedDate, title, undefined, adults, children, time, address);
    } else {
      let servicesToCreate: string[];
      if (quickOption === "custom") {
        servicesToCreate = selectedServices.map(
          (id) => DEFAULT_SERVICE_TYPES.find((m) => m.id === id)?.label || id
        );
      } else {
        servicesToCreate = QUICK_OPTIONS.find((o) => o.id === quickOption)?.services || ["Service"];
      }
      onSubmit(formattedDate, title, servicesToCreate, adults, children, time, address);
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
          <div className="space-y-2">
            <Label
              htmlFor="date"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Date
            </Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "h-12 w-full justify-start rounded-2xl border-gray-100 bg-gray-50/50 text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[100] w-auto overflow-hidden rounded-2xl p-0 shadow-xl"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                  }}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="time"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Heure
              </Label>
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 pl-10 text-base focus:bg-white focus:ring-accent/20"
                />
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
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
                placeholder="Ex: Réveillon..."
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="address"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Adresse
            </Label>
            <div className="relative">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: 123 Rue de la Fête, Paris"
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 pl-10 text-base focus:bg-white focus:ring-accent/20"
              />
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="adults"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Adultes
              </Label>
              <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <SelectValue placeholder="Adultes" />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
                  {Array.from({ length: 51 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {i === 1 ? "adulte" : "adultes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="children"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Enfants
              </Label>
              <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <SelectValue placeholder="Enfants" />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
                  {Array.from({ length: 51 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {i === 1 ? "enfant" : "enfants"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    Mettre à jour
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
                      "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all duration-300",
                      isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-gray-100"
                    )}
                  >
                    {opt.icon}
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
                        {type.icon}
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
