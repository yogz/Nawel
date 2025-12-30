"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fr, enUS, el, de, es, pt } from "date-fns/locale";

const dateLocales: Record<string, typeof fr> = {
  fr,
  en: enUS,
  el,
  de,
  es,
  pt,
};

export interface EditEventData {
  name: string;
  description: string | null;
  adults: number;
  children: number;
  // From the first meal
  date?: string;
  time?: string | null;
  address?: string | null;
  mealId?: number;
}

interface EditEventSheetProps {
  open: boolean;
  onClose: () => void;
  initialData: EditEventData;
  onSubmit: (data: {
    name: string;
    description?: string;
    adults: number;
    children: number;
    // Meal data
    mealId?: number;
    date?: string;
    time?: string;
    address?: string;
  }) => void;
  isPending?: boolean;
}

export function EditEventSheet({
  open,
  onClose,
  initialData,
  onSubmit,
  isPending = false,
}: EditEventSheetProps) {
  const t = useTranslations("Dashboard.EventList");
  const tCommon = useTranslations("EventDashboard.Shared");
  const tMeal = useTranslations("EventDashboard.Meal");
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";
  const dateLocale = dateLocales[currentLocale] || fr;

  // Form state
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description || "");
  const [adults, setAdults] = useState(initialData.adults);
  const [children, setChildren] = useState(initialData.children);
  const [date, setDate] = useState<Date | undefined>(
    initialData.date ? new Date(initialData.date) : undefined
  );
  const [time, setTime] = useState(initialData.time || "");
  const [address, setAddress] = useState(initialData.address || "");

  // Track if form has changes for auto-save on close
  const stateRef = useRef({ name, description, adults, children, date, time, address });
  const hasChangesRef = useRef(false);

  // Update state ref when values change
  useEffect(() => {
    const hasChanged =
      name !== initialData.name ||
      description !== (initialData.description || "") ||
      adults !== initialData.adults ||
      children !== initialData.children ||
      (date ? format(date, "yyyy-MM-dd") : "") !== (initialData.date || "") ||
      time !== (initialData.time || "") ||
      address !== (initialData.address || "");

    hasChangesRef.current = hasChanged;
    stateRef.current = { name, description, adults, children, date, time, address };
  }, [name, description, adults, children, date, time, address, initialData]);

  // Reset form when initialData changes
  useEffect(() => {
    setName(initialData.name);
    setDescription(initialData.description || "");
    setAdults(initialData.adults);
    setChildren(initialData.children);
    setDate(initialData.date ? new Date(initialData.date) : undefined);
    setTime(initialData.time || "");
    setAddress(initialData.address || "");
  }, [initialData]);

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      adults,
      children,
      mealId: initialData.mealId,
      date: date ? format(date, "yyyy-MM-dd") : undefined,
      time: time.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  const hasMeal = !!initialData.mealId;

  return (
    <BottomSheet open={open} onClose={onClose} title={t("editTitle")}>
      <div className="space-y-4 pb-4">
        {/* Event Name */}
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {t("nameLabel")}
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
          />
        </div>

        {/* Date & Time - only if event has a meal */}
        {hasMeal && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="date"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {tMeal("dateLabel")}
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
                    {date ? (
                      format(date, "dd/MM/yy", { locale: dateLocale })
                    ) : (
                      <span className="text-gray-400">{tMeal("datePlaceholder")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[100] w-auto overflow-hidden rounded-2xl p-0 shadow-xl"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={dateLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="time"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {tMeal("timeLabel")}
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
          </div>
        )}

        {/* Guests */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="adults"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {tCommon("adultsLabel")}
            </Label>
            <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
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
            <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
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

        {/* Address - only if event has a meal */}
        {hasMeal && (
          <div className="space-y-2">
            <Label
              htmlFor="address"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {tMeal("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={tMeal("addressPlaceholder")}
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 pl-10 text-base focus:bg-white focus:ring-accent/20"
              />
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {t("descriptionLabel")}
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className="min-h-[80px] resize-none rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="premium"
            onClick={onClose}
            className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
            icon={<X size={16} />}
          >
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
              {tCommon("cancel")}
            </span>
          </Button>
          <Button
            type="button"
            variant="premium"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="flex-[2] py-6 pr-8 shadow-md"
            icon={<Check size={16} />}
            shine
          >
            <span className="text-sm font-black uppercase tracking-widest text-gray-700">
              {isPending ? tCommon("saving") : tCommon("save")}
            </span>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
