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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ServiceForm({
  meals,
  defaultMealId,
  forceNewMeal,
  onSubmit,
  readOnly,
}: {
  meals: Meal[];
  defaultMealId?: number;
  forceNewMeal?: boolean;
  onSubmit: (
    mealId: number,
    title: string,
    peopleCount: number,
    newMealDate?: string,
    newMealTitle?: string
  ) => Promise<void>;
  readOnly?: boolean;
}) {
  const [mealId, setMealId] = useState<string>(
    defaultMealId !== undefined && defaultMealId !== -1
      ? String(defaultMealId)
      : forceNewMeal || meals.length === 0
        ? "new"
        : String(meals[0].id)
  );
  const [title, setTitle] = useState("");
  const [peopleCount, setPeopleCount] = useState(1);
  const [newMealDate, setNewMealDate] = useState<Date | undefined>(undefined);
  const [newMealTitle, setNewMealTitle] = useState("");

  const handleSubmit = async () => {
    if (mealId === "new") {
      if (!newMealDate) {
        return;
      }
      const formattedDate = format(newMealDate, "yyyy-MM-dd");
      await onSubmit(-1, title, peopleCount, formattedDate, newMealTitle);
    } else {
      await onSubmit(Number(mealId), title, peopleCount);
    }
  };

  return (
    <div className="space-y-6">
      {!forceNewMeal && meals.length > 0 && (
        <div className="space-y-2">
          <Label>Choisir le repas</Label>
          <Select value={mealId} onValueChange={setMealId} disabled={readOnly}>
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

      <div className="space-y-2">
        <Label htmlFor="service-title">Nom du service</Label>
        <Input
          id="service-title"
          placeholder="Ex: Entrée, Plat, Dessert..."
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
        disabled={readOnly || !title.trim() || ((mealId === "new" || forceNewMeal) && !newMealDate)}
      >
        Ajouter le service
      </Button>
    </div>
  );
}
