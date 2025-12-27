"use client";

import { useState } from "react";
import { type Meal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ServiceForm({
  meals,
  defaultMealId,
  defaultAdults = 0,
  defaultChildren = 0,
  defaultPeopleCount = 0,
  forceNewMeal,
  onSubmit,
  readOnly,
}: {
  meals: Meal[];
  defaultMealId?: number;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultPeopleCount?: number;
  forceNewMeal?: boolean;
  onSubmit: (
    mealId: number,
    title: string,
    adults: number,
    children: number,
    peopleCount: number,
    newMealDate?: string,
    newMealTitle?: string
  ) => Promise<void>;
  readOnly?: boolean;
}) {
  const initialMealId =
    defaultMealId !== undefined && defaultMealId !== -1
      ? String(defaultMealId)
      : forceNewMeal || meals.length === 0
        ? "new"
        : String(meals[0].id);

  const initialMeal = meals.find((m) => String(m.id) === initialMealId);
  const initialAdults = initialMeal ? initialMeal.adults : defaultAdults;
  const initialChildren = initialMeal ? initialMeal.children : defaultChildren;
  const initialPeople = initialMeal
    ? initialMeal.adults + initialMeal.children
    : defaultPeopleCount;

  const [mealId, setMealId] = useState<string>(initialMealId);
  const [title, setTitle] = useState("");
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [peopleCount, setPeopleCount] = useState(initialPeople);
  const [newMealDate, setNewMealDate] = useState<Date | undefined>(undefined);
  const [newMealTitle, setNewMealTitle] = useState("");

  const handleSubmit = async () => {
    if (mealId === "new") {
      if (!newMealDate) {
        return;
      }
      const formattedDate = format(newMealDate, "yyyy-MM-dd");
      await onSubmit(-1, title, adults, children, peopleCount, formattedDate, newMealTitle);
    } else {
      await onSubmit(Number(mealId), title, adults, children, peopleCount);
    }
  };

  return (
    <div className="space-y-6">
      {!forceNewMeal && meals.length > 0 && (
        <div className="space-y-2">
          <Label>Choisir le repas</Label>
          <Select
            value={mealId}
            onValueChange={(val) => {
              setMealId(val);
              const meal = meals.find((m) => String(m.id) === val);
              if (meal) {
                setAdults(meal.adults);
                setChildren(meal.children);
                setPeopleCount(meal.adults + meal.children);
              } else {
                setAdults(initialAdults);
                setChildren(initialChildren);
                setPeopleCount(defaultPeopleCount);
              }
            }}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un repas" />
            </SelectTrigger>
            <SelectContent>
              {meals.map((meal) => (
                <SelectItem key={meal.id} value={String(meal.id)}>
                  {meal.title || meal.date}
                </SelectItem>
              ))}
              <SelectItem value="new">+ Nouveau repas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(mealId === "new" || forceNewMeal) && (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            Nouveau repas
          </p>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "h-12 w-full justify-start rounded-2xl text-left font-normal",
                    !newMealDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newMealDate ? (
                    format(newMealDate, "PPP", { locale: fr })
                  ) : (
                    <span>Choisir une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl p-0 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={newMealDate}
                  onSelect={setNewMealDate}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-title">Titre (optionnel)</Label>
            <Input
              id="meal-title"
              placeholder="Ex: Réveillon, Jour J..."
              value={newMealTitle}
              onChange={(e) => setNewMealTitle(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Label
          htmlFor="service-title"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          Nom du service
        </Label>
        <Input
          id="service-title"
          placeholder="Ex: Entrée, Plat, Dessert..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          autoFocus
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
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setAdults(val);
              setPeopleCount(val + children);
            }}
            disabled={readOnly}
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
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setChildren(val);
              setPeopleCount(adults + val);
            }}
            disabled={readOnly}
            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="people-count"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          Nombre de personnes (Total)
        </Label>
        <Input
          id="people-count"
          type="number"
          min="0"
          placeholder="Ex: 8"
          value={peopleCount}
          onChange={(e) => setPeopleCount(parseInt(e.target.value) || 0)}
          disabled={readOnly}
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white"
        />
      </div>

      <div className="pt-4">
        <Button
          variant="premium"
          className="w-full py-7 pr-8 shadow-md"
          icon={<Plus />}
          onClick={handleSubmit}
          disabled={
            readOnly || !title.trim() || ((mealId === "new" || forceNewMeal) && !newMealDate)
          }
          shine
        >
          <span className="text-sm font-black uppercase tracking-widest text-gray-700">
            Ajouter le service
          </span>
        </Button>
      </div>
    </div>
  );
}
