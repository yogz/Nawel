"use client";

import { useState, useTransition } from "react";
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
import { CalendarIcon, Plus, Clock, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, el, de, es, pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

const dateLocales: Record<string, any> = {
  fr,
  en: enUS,
  el,
  de,
  es,
  pt,
};

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
    newMealTitle?: string,
    newMealTime?: string,
    newMealAddress?: string
  ) => Promise<void>;
  readOnly?: boolean;
}) {
  const t = useTranslations("EventDashboard.ServiceForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const tMeal = useTranslations("EventDashboard.Meal");
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";
  const dateLocale = dateLocales[currentLocale] || fr;
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
  const [newMealTime, setNewMealTime] = useState("");
  const [newMealAddress, setNewMealAddress] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (isPending) {
      return;
    }
    startTransition(async () => {
      if (mealId === "new") {
        if (!newMealDate) {
          return;
        }
        const formattedDate = format(newMealDate, "yyyy-MM-dd");
        await onSubmit(
          -1,
          title,
          adults,
          children,
          peopleCount,
          formattedDate,
          newMealTitle,
          newMealTime,
          newMealAddress
        );
      } else {
        await onSubmit(Number(mealId), title, adults, children, peopleCount);
      }
    });
  };

  return (
    <div className="space-y-4">
      {!forceNewMeal && meals.length > 0 && (
        <div className="space-y-2">
          <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t("selectMealLabel")}
          </Label>
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
              <SelectValue placeholder={t("selectMealPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {meals.map((meal) => (
                <SelectItem key={meal.id} value={String(meal.id)}>
                  {meal.title || meal.date}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <span className="flex items-center gap-1.5 text-accent">
                  <Plus size={14} />
                  {t("newMealOption")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(mealId === "new" || forceNewMeal) && (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            {t("newMealSection")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="date"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Date
              </Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={newMealDate ? format(newMealDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMealDate(val ? new Date(val) : undefined);
                  }}
                  className="h-10 w-full rounded-xl border-gray-100 bg-gray-50/50 pl-9 text-base focus:bg-white focus:ring-accent/20"
                />
                <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-time">{tMeal("timeLabel")}</Label>
              <div className="relative">
                <Input
                  id="meal-time"
                  type="time"
                  value={newMealTime}
                  onChange={(e) => setNewMealTime(e.target.value)}
                  disabled={readOnly}
                  enterKeyHint="next"
                  className="h-10 rounded-xl pl-9"
                />
                <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="meal-title"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {tMeal("titleLabel")}
            </Label>
            <Input
              id="meal-title"
              placeholder={tMeal("titlePlaceholder")}
              value={newMealTitle}
              onChange={(e) => setNewMealTitle(e.target.value)}
              disabled={readOnly}
              autoCapitalize="sentences"
              enterKeyHint="next"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="meal-address"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {tMeal("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                id="meal-address"
                placeholder={tMeal("addressPlaceholder")}
                value={newMealAddress}
                onChange={(e) => setNewMealAddress(e.target.value)}
                disabled={readOnly}
                autoComplete="street-address"
                autoCapitalize="sentences"
                enterKeyHint="next"
                className="h-10 rounded-xl pl-9"
              />
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Label
          htmlFor="service-title"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          {t("label")}
        </Label>
        <Input
          id="service-title"
          placeholder={t("placeholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="adults"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {tCommon("adultsLabel")}
          </Label>
          <Select
            value={String(adults)}
            onValueChange={(val) => {
              const v = parseInt(val);
              setAdults(v);
              setPeopleCount(v + children);
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
              <SelectValue placeholder={tCommon("adultsLabel")} />
            </SelectTrigger>
            <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
              {Array.from({ length: 51 }, (_, i) => (
                <SelectItem key={i} value={String(i)} className="rounded-xl">
                  {i} {tCommon("adultsCount", { count: i })}
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
            {tCommon("childrenLabel")}
          </Label>
          <Select
            value={String(children)}
            onValueChange={(val) => {
              const v = parseInt(val);
              setChildren(v);
              setPeopleCount(adults + v);
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
              <SelectValue placeholder={tCommon("childrenLabel")} />
            </SelectTrigger>
            <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
              {Array.from({ length: 51 }, (_, i) => (
                <SelectItem key={i} value={String(i)} className="rounded-xl">
                  {i} {tCommon("childrenCount", { count: i })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-4">
        <Button
          variant="premium"
          className="w-full py-6 pr-8 shadow-md"
          icon={isPending ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
          onClick={handleSubmit}
          disabled={
            readOnly ||
            !title.trim() ||
            ((mealId === "new" || forceNewMeal) && !newMealDate) ||
            isPending
          }
          shine={!isPending}
        >
          <span className="text-sm font-black uppercase tracking-widest text-gray-700">
            {isPending ? t("adding") : t("addButton")}
          </span>
        </Button>
      </div>
    </div>
  );
}
