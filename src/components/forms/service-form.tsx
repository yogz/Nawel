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
import { fr, enUS, es, pt, de, el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

const dateLocales = { fr, en: enUS, es, pt, de, el };

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
  const t = useTranslations("EventDashboard.Forms.Service");
  const tMeal = useTranslations("EventDashboard.Forms.Meal");
  const tShared = useTranslations("EventDashboard.Forms.Shared");
  const locale = useLocale();
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] || fr;

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
          <Label>{tMeal("selectMeal") || "Choisir le repas"}</Label>
          <Select value={mealId} onValueChange={setMealId} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue
                placeholder={tMeal("selectMealPlaceholder") || "Sélectionner un repas"}
              />
            </SelectTrigger>
            <SelectContent>
              {meals.map((meal) => (
                <SelectItem key={meal.id} value={String(meal.id)}>
                  {meal.title || meal.date}
                </SelectItem>
              ))}
              <SelectItem value="new">+ {t("newMealHeader")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(mealId === "new" || forceNewMeal) && (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            {t("newMealHeader")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="date">{tMeal("dateLabel")}</Label>
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
                    format(newMealDate, "PPP", { locale: dateLocale })
                  ) : (
                    <span>{tMeal("datePlaceholder")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl p-0 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={newMealDate}
                  onSelect={setNewMealDate}
                  initialFocus
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-title">
              {tMeal("titleLabel")} ({tShared("optional") || "optionnel"})
            </Label>
            <Input
              id="meal-title"
              placeholder={tMeal("titlePlaceholder")}
              value={newMealTitle}
              onChange={(e) => setNewMealTitle(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="service-title">{t("label")}</Label>
        <Input
          id="service-title"
          placeholder={t("placeholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="people-count">{tShared("peopleCountLabel")}</Label>
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
        variant="premium"
        className="w-full py-6 pr-8 shadow-md"
        icon={<CalendarIcon size={16} />}
        onClick={handleSubmit}
        disabled={readOnly || !title.trim() || ((mealId === "new" || forceNewMeal) && !newMealDate)}
        shine
      >
        <span className="text-sm font-black uppercase tracking-widest text-gray-700">
          {t("addService") || "Ajouter le service"}
        </span>
      </Button>
    </div>
  );
}
