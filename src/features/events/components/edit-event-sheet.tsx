"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Check, X, Calendar, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
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

  const format = (date: Date, fmt: string) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (fmt === "yyyy-MM-dd") {
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
    return date.toLocaleDateString();
  };

  const hasMeal = !!initialData.mealId;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle>{t("editTitle")}</DrawerTitle>
            <DrawerClose asChild>
              <button
                className="rounded-full bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95"
                aria-label={tCommon("close") || "Fermer"}
              >
                <X size={16} />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="scrollbar-none flex-1 overflow-y-auto pb-40">
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
                autoCapitalize="sentences"
                enterKeyHint="next"
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
              />
            </div>

            {/* Date & Time - only if event has a meal */}
            {hasMeal && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="date"
                    className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
                  >
                    {tMeal("dateLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="date"
                      type="date"
                      value={date ? format(date, "yyyy-MM-dd") : ""}
                      onChange={(e) =>
                        setDate(e.target.value ? new Date(e.target.value) : undefined)
                      }
                      enterKeyHint="next"
                      className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 pr-4 text-base focus:bg-white focus:ring-accent/20"
                    />
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
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
                      enterKeyHint="next"
                      className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 pr-4 text-base focus:bg-white focus:ring-accent/20"
                    />
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                    <SelectValue placeholder={tCommon("adultsLabel")} />
                  </SelectTrigger>
                  <SelectContent className="z-[110] max-h-[300px] rounded-xl">
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
                  onValueChange={(val) => setChildren(parseInt(val))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                    <SelectValue placeholder={tCommon("childrenLabel")} />
                  </SelectTrigger>
                  <SelectContent className="z-[110] max-h-[300px] rounded-xl">
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
                    autoComplete="street-address"
                    autoCapitalize="sentences"
                    enterKeyHint="next"
                    className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 text-base focus:bg-white focus:ring-accent/20"
                  />
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                autoCapitalize="sentences"
                className="min-h-[70px] resize-none rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="premium"
                  className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
                  icon={<X size={16} />}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                    {tCommon("cancel")}
                  </span>
                </Button>
              </DrawerClose>
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
