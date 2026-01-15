"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  UtensilsCrossed,
  Utensils,
  GlassWater,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  Sparkles,
  Luggage,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AutoSizeInput } from "@/components/common/auto-size-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventForm({
  onSubmit,
  onClose,
  isPending,
  error,
  inline = false,
  showWarnings = false,
  initialData,
  isAuthenticated,
}: {
  onSubmit: (
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "vacation",
    date?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string,
    duration?: number
  ) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
  inline?: boolean;
  showWarnings?: boolean;
  initialData?: {
    name: string;
    description: string | null;
    adults: number;
    children: number;
    date: string;
    address?: string;
    time?: string;
  };
  isAuthenticated?: boolean;
}) {
  const t = useTranslations("CreateEvent");
  const tShared = useTranslations("EventDashboard.Shared");
  const locale = useLocale();

  // Primary State
  const [name, setName] = useState(initialData?.name ?? "");
  const [isVacation, setIsVacation] = useState(false);
  const [duration, setDuration] = useState(7);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced State
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [creationMode, setCreationMode] = useState<"total" | "classique" | "apero" | "vacation">(
    "total"
  );
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [time, setTime] = useState(initialData?.time ?? "20:00");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [adults, setAdults] = useState(initialData?.adults ?? 2);
  const [children, setChildren] = useState(initialData?.children ?? 0);

  // Computed duration from dates
  const computedDuration = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  );

  const nameRef = useRef<HTMLInputElement>(null);

  // Focus management
  useEffect(() => {
    const timer = setTimeout(() => {
      nameRef.current?.focus();
    }, 400); // Slightly longer delay for entering the drawer
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const finalMode = isVacation ? "vacation" : creationMode;

    onSubmit(
      name.trim(),
      description.trim() || undefined,
      finalMode,
      date,
      adults,
      children,
      time,
      address,
      duration
    );
  };

  // Use computed duration for vacation mode
  const effectiveDuration = isVacation ? computedDuration : duration;

  const content = (
    <div className="flex flex-col gap-8 px-1 pb-32 pt-2 sm:gap-10 sm:pb-36">
      {/* 1. Hero Input: The Name */}
      <div className="space-y-4">
        <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">
          {t("eventNameLabel")}
        </Label>
        <div className="relative">
          <AutoSizeInput
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) handleSubmit();
            }}
            placeholder={t("eventNamePlaceholder")}
            maxSize={48}
            minSize={20}
            className="h-auto border-none bg-transparent p-0 font-black tracking-tighter placeholder:text-gray-300 focus-visible:ring-0"
          />
          {name.trim().length === 0 && (
            <div className="pointer-events-none absolute bottom-1 left-0 h-[3px] w-8 animate-pulse bg-accent" />
          )}
        </div>
      </div>

      {/* 2. Type Selection Cards */}
      <div className="space-y-4">
        <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          Type d'événement
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setIsVacation(false)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 active:scale-[0.98]",
              !isVacation
                ? "border-accent bg-accent/[0.03] shadow-lg shadow-accent/10 ring-1 ring-accent/10"
                : "border-gray-50 bg-white hover:border-gray-100"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300",
                !isVacation
                  ? "bg-accent text-white"
                  : "bg-gray-50 text-gray-300 group-hover:text-gray-400"
              )}
            >
              <Utensils size={24} />
            </div>
            <div className="text-center">
              <span
                className={cn(
                  "block text-lg font-bold tracking-tight transition-colors duration-300",
                  !isVacation ? "text-accent" : "text-gray-400 group-hover:text-gray-600"
                )}
              >
                1 Repas
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-300">
                Classique
              </span>
            </div>
            {!isVacation && (
              <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>

          <button
            onClick={() => setIsVacation(true)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 active:scale-[0.98]",
              isVacation
                ? "border-accent bg-accent/[0.03] shadow-lg shadow-accent/10 ring-1 ring-accent/10"
                : "border-gray-50 bg-white hover:border-gray-100"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300",
                isVacation
                  ? "bg-accent text-white"
                  : "bg-gray-50 text-gray-300 group-hover:text-gray-400"
              )}
            >
              <Luggage size={24} />
            </div>
            <div className="text-center">
              <span
                className={cn(
                  "block text-lg font-bold tracking-tight transition-colors duration-300",
                  isVacation ? "text-accent" : "text-gray-400 group-hover:text-gray-600"
                )}
              >
                Séjour
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-300">
                Plusieurs jours
              </span>
            </div>
            {isVacation && (
              <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Date Range Selector (Conditional) */}
      {isVacation && (
        <div className="animate-in fade-in slide-in-from-top-4 space-y-4 duration-500">
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Du
              </Label>
              <div className="relative group">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-14 touch-wrapper rounded-2xl border-gray-200 bg-white pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                />
                <Calendar
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-accent"
                />
              </div>
            </div>
            {/* End Date */}
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Au
              </Label>
              <div className="relative group">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className="h-14 touch-wrapper rounded-2xl border-gray-200 bg-white pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                />
                <Calendar
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-accent"
                />
              </div>
            </div>
          </div>
          {/* Duration badge */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/5 px-4 py-2 text-sm font-bold text-accent">
              <Sparkles size={14} />
              {computedDuration} {computedDuration > 1 ? "jours" : "jour"} de séjour
            </span>
          </div>
        </div>
      )}

      {/* 4. Advanced Section Toggle */}
      <div className="pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="group flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-accent">
            Plus d'options {!showAdvanced && <span className="text-gray-300">(3)</span>}
          </span>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all group-hover:bg-accent/10 group-hover:text-accent",
              showAdvanced ? "rotate-90" : "-rotate-90"
            )}
          >
            <ChevronDown
              size={16}
              className={cn("transition-transform", showAdvanced && "rotate-180")}
            />
          </div>
        </button>

        {showAdvanced && (
          <div className="animate-in fade-in zoom-in-95 slide-in-from-top-2 mt-4 space-y-6 rounded-[2rem] border border-gray-100 bg-gray-50/30 p-6 duration-300">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t("dateLabel")}
                </Label>
                <div className="relative group">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-14 touch-wrapper rounded-2xl border-gray-200 bg-white pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                  />
                  <Calendar
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-accent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t("timeLabel")}
                </Label>
                <div className="relative group">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-14 touch-wrapper rounded-2xl border-gray-200 bg-white pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                  />
                  <Clock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-accent"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("addressLabel")}
              </Label>
              <div className="relative group">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  className="h-14 touch-wrapper rounded-2xl border-gray-200 bg-white pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                />
                <MapPin
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-accent"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {tShared("adultsLabel")}
                </Label>
                <Select value={String(adults)} onValueChange={(v) => setAdults(parseInt(v))}>
                  <SelectTrigger className="h-14 rounded-2xl border-gray-200 bg-white font-medium focus:border-accent focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-2xl border-gray-100 shadow-xl">
                    {Array.from({ length: 51 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="rounded-xl py-3">
                        {i} {tShared("adultsCount", { count: i })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {tShared("childrenLabel")}
                </Label>
                <Select value={String(children)} onValueChange={(v) => setChildren(parseInt(v))}>
                  <SelectTrigger className="h-14 rounded-2xl border-gray-200 bg-white font-medium focus:border-accent focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-2xl border-gray-100 shadow-xl">
                    {Array.from({ length: 51 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="rounded-xl py-3">
                        {i} {tShared("childrenCount", { count: i })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("descriptionLabel")}
              </Label>
              <div className="relative group">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="min-h-[100px] resize-none rounded-3xl border-gray-200 bg-white p-4 pl-11 font-medium transition-colors focus:border-accent focus:ring-0 group-hover:border-accent/50"
                  style={{ fontSize: "16px" }} // Prevent zoom on iOS
                />
                <MessageSquare
                  size={18}
                  className="absolute left-4 top-5 text-gray-400 transition-colors group-hover:text-accent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Magic Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[2.5rem] bg-white/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl border border-white/40">
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isPending}
              className={cn(
                "h-16 w-full rounded-[2rem] text-lg font-black tracking-tight transition-all duration-300 active:scale-[0.98]",
                name.trim()
                  ? "bg-gradient-to-br from-accent via-accent to-[hsl(var(--accent)/0.85)] text-white shadow-[0_4px_24px_rgba(var(--accent-rgb),0.45)] hover:shadow-[0_8px_32px_rgba(var(--accent-rgb),0.55)] hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-300"
              )}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <span>C'est parti !</span>
                  <Sparkles
                    size={20}
                    className={cn("transition-transform", name.trim() && "animate-pulse")}
                  />
                </div>
              )}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-center text-xs font-bold text-red-500 animate-in fade-in slide-in-from-bottom-2 bg-white/80 backdrop-blur-sm py-1 rounded-full inline-block px-4 mx-auto left-0 right-0 absolute w-fit">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[96vh] px-4 sm:px-6">
        <DrawerHeader className="px-0 pb-6 pt-4 text-left">
          <DrawerTitle className="text-xl font-black tracking-tight text-gray-900">
            {t("title")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-hide overflow-y-auto overscroll-contain">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
