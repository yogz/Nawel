"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Utensils,
  Loader2,
  MapPin,
  Users,
  MessageSquare,
  Sparkles,
  Luggage,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

export function EventForm({
  onSubmit,
  onClose,
  isPending,
  error,
  inline = false,
  initialData,
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
  initialData?: {
    name: string;
    description: string | null;
    adults: number;
    children: number;
    date: string;
    address?: string;
    time?: string;
  };
}) {
  const t = useTranslations("CreateEvent");
  const tShared = useTranslations("EventDashboard.Shared");

  // Primary State
  const [name, setName] = useState(initialData?.name ?? "");
  const [isVacation, setIsVacation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Constants
  const defaultDuration = 7;
  const creationMode: "total" | "classique" | "apero" | "vacation" = "total";

  // Advanced State
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
  );
  const [time, setTime] = useState(initialData?.time ?? "20:00");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [adults, setAdults] = useState(initialData?.adults ?? 2);
  const [children, setChildren] = useState(initialData?.children ?? 0);

  // Computed duration from dates
  const computedDuration = Math.max(
    1,
    Math.round((endDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
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
    if (!name.trim()) {
      return;
    }

    const finalMode = isVacation ? "vacation" : creationMode;
    const effectiveDuration = isVacation ? computedDuration : defaultDuration;

    onSubmit(
      name.trim(),
      description.trim() || undefined,
      finalMode,
      // Use local date methods to avoid timezone issues with toISOString()
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      adults,
      children,
      time,
      address,
      effectiveDuration
    );
  };

  const content = (
    <div
      className="flex w-full min-w-0 flex-col gap-4 overflow-hidden px-0 pb-24 sm:gap-6 sm:pb-32"
      suppressHydrationWarning
    >
      {/* 1. Hero Input: The Name */}
      <div className="space-y-2">
        <Label className="ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-accent/60">
          {t("eventNameLabel")}
        </Label>
        <div className="relative">
          <AutoSizeInput
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleSubmit();
              }
            }}
            placeholder={t("eventNamePlaceholder")}
            maxSize={36}
            minSize={16}
            className="h-auto border-none bg-transparent p-0 font-black tracking-tighter placeholder:text-gray-300 focus-visible:ring-0"
          />
          {name.trim().length === 0 && (
            <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-6 animate-pulse bg-accent" />
          )}
        </div>
      </div>

      {/* 2. Type Selection Cards */}
      <div className="space-y-2">
        <Label className="ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
          {t("eventType")}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsVacation(false)}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 transition-all duration-300 active:scale-[0.98]",
              !isVacation
                ? "border-accent bg-accent/[0.03] shadow-md shadow-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                !isVacation ? "bg-accent text-white" : "bg-gray-50 text-gray-500"
              )}
            >
              <Utensils size={20} />
            </div>
            <div className="text-left">
              <span
                className={cn(
                  "block text-sm font-bold tracking-tight transition-colors duration-300",
                  !isVacation ? "text-accent" : "text-gray-600"
                )}
              >
                {t("meal")}
              </span>
              <span className="text-[9px] font-medium text-gray-400">
                {t("singleMealSubtitle")}
              </span>
            </div>
          </button>

          <button
            onClick={() => setIsVacation(true)}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 transition-all duration-300 active:scale-[0.98]",
              isVacation
                ? "border-accent bg-accent/[0.03] shadow-md shadow-accent/10"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                isVacation ? "bg-accent text-white" : "bg-gray-50 text-gray-500"
              )}
            >
              <Luggage size={20} />
            </div>
            <div className="text-left">
              <span
                className={cn(
                  "block text-sm font-bold tracking-tight transition-colors duration-300",
                  isVacation ? "text-accent" : "text-gray-600"
                )}
              >
                {t("stay")}
              </span>
              <span className="text-[9px] font-medium text-gray-400">{t("staySubtitle")}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Date Range Selector (Conditional) */}
      {isVacation && (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-3 duration-300">
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1">
              <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                {t("dateFrom")}
              </Label>
              <DatePicker
                value={date}
                onChange={(d) => d && setDate(d)}
                placeholder={t("startDatePlaceholder")}
                className="h-11 rounded-xl border-gray-100 bg-white text-sm font-medium hover:border-accent/30"
              />
            </div>
            {/* End Date */}
            <div className="space-y-1">
              <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                {t("dateTo")}
              </Label>
              <DatePicker
                value={endDate}
                onChange={(d) => d && setEndDate(d)}
                placeholder={t("endDatePlaceholder")}
                fromDate={date}
                className="h-11 rounded-xl border-gray-100 bg-white text-sm font-medium hover:border-accent/30"
              />
            </div>
          </div>
          {/* Duration badge */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/5 px-3 py-1 text-xs font-bold text-accent">
              <Sparkles size={12} />
              {t("stayDuration", { count: computedDuration })}
            </span>
          </div>
        </div>
      )}

      {/* 3b. Date & Time (for single meal) */}
      {!isVacation && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
              {t("dateLabel")}
            </Label>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d)}
              placeholder={t("datePlaceholder")}
              className="h-11 rounded-xl border-gray-200 bg-white text-sm font-medium hover:border-accent/50"
            />
          </div>
          <div className="space-y-1">
            <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
              {t("timeLabel")}
            </Label>
            <TimePicker
              value={time}
              onChange={(t) => setTime(t)}
              placeholder={t("timeLabel")}
              className="h-11 rounded-xl border-gray-200 bg-white text-sm font-medium hover:border-accent/50"
            />
          </div>
        </div>
      )}

      {/* 4. Advanced Section Toggle */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="group flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-accent">
            {t("moreOptions")}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "text-gray-400 transition-transform group-hover:text-accent",
              showAdvanced && "rotate-180"
            )}
          />
        </button>

        {showAdvanced && (
          <div className="animate-in fade-in slide-in-from-top-2 mt-2 space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 duration-200">
            {/* Guests */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  {tShared("adultsLabel")}
                </Label>
                <Select value={String(adults)} onValueChange={(v) => setAdults(parseInt(v))}>
                  <SelectTrigger className="h-10 rounded-lg border-gray-200 bg-white text-sm font-medium focus:border-accent focus:ring-0">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] rounded-xl border-gray-100 shadow-lg">
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="rounded-lg py-2 text-sm">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  {tShared("childrenLabel")}
                </Label>
                <Select value={String(children)} onValueChange={(v) => setChildren(parseInt(v))}>
                  <SelectTrigger className="h-10 rounded-lg border-gray-200 bg-white text-sm font-medium focus:border-accent focus:ring-0">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] rounded-xl border-gray-100 shadow-lg">
                    {Array.from({ length: 21 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="rounded-lg py-2 text-sm">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                {t("addressLabel")}
              </Label>
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  className="h-10 rounded-lg border-gray-200 bg-white pl-9 text-sm font-medium focus:border-accent focus:ring-0"
                />
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                {t("descriptionLabel")}
              </Label>
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="min-h-[60px] resize-none rounded-lg border-gray-200 bg-white p-2.5 pl-9 text-sm font-medium focus:border-accent focus:ring-0"
                  style={{ fontSize: "16px" }}
                />
                <MessageSquare size={14} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white/90 p-1.5 shadow-lg backdrop-blur-lg border border-gray-200/50">
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isPending}
              className={cn(
                "h-12 w-full rounded-xl text-base font-bold tracking-tight transition-all duration-300 active:scale-[0.98]",
                name.trim()
                  ? "bg-accent text-white shadow-md hover:bg-accent/90"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <span>{t("createButton")}</span>
                  <Sparkles size={16} className={cn(name.trim() && "animate-pulse")} />
                </div>
              )}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-center text-xs font-medium text-red-500 animate-in fade-in">
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
