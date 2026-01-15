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
  Palmtree,
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
  const [time, setTime] = useState(initialData?.time ?? "20:00");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [adults, setAdults] = useState(initialData?.adults ?? 2);
  const [children, setChildren] = useState(initialData?.children ?? 0);

  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      nameRef.current?.focus();
    }, 300);
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

  const content = (
    <div className="flex flex-col gap-6 px-1 pb-8 sm:gap-8">
      {/* 1. Hero Input: The Name */}
      <div className="space-y-3">
        <Label className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-accent/60">
          {t("eventNameLabel")}
        </Label>
        <Input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) handleSubmit();
          }}
          placeholder={t("eventNamePlaceholder")}
          className="h-auto border-none bg-transparent p-0 text-3xl font-black tracking-tight placeholder:text-gray-200 focus-visible:ring-0 sm:text-4xl"
        />
      </div>

      {/* 2. Type Switch: Repas vs Vacances */}
      <div className="space-y-4">
        <Label className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
          Type d'événement
        </Label>
        <div className="grid grid-cols-2 gap-3 p-1">
          <button
            onClick={() => setIsVacation(false)}
            className={cn(
              "flex h-14 items-center justify-center gap-3 rounded-2xl border-2 transition-all active:scale-95",
              !isVacation
                ? "border-accent bg-accent/5 font-bold text-accent shadow-sm"
                : "border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-100"
            )}
          >
            <Utensils size={20} className={!isVacation ? "text-accent" : "text-gray-400"} />
            <span>1 Repas</span>
          </button>
          <button
            onClick={() => setIsVacation(true)}
            className={cn(
              "flex h-14 items-center justify-center gap-3 rounded-2xl border-2 transition-all active:scale-95",
              isVacation
                ? "border-accent bg-accent/5 font-bold text-accent shadow-sm"
                : "border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-100"
            )}
          >
            <Palmtree size={20} className={isVacation ? "text-accent" : "text-gray-400"} />
            <span>Vacances</span>
          </button>
        </div>
      </div>

      {/* 3. Duration Selector (Conditional) */}
      {isVacation && (
        <div className="animate-in fade-in slide-in-from-top-4 space-y-4 duration-500">
          <Label className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            {t("durationLabel")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {[2, 3, 5, 7, 10, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={cn(
                  "flex h-11 min-w-[3.5rem] items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-all active:scale-90",
                  duration === d
                    ? "border-accent bg-accent text-white shadow-md shadow-accent/20"
                    : "border-gray-50 bg-white text-gray-600 hover:border-gray-200"
                )}
              >
                {d}
              </button>
            ))}
            <div className="relative flex items-center">
              <Input
                type="number"
                min={1}
                max={31}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="h-11 w-20 rounded-xl border-2 border-gray-50 bg-white text-center font-black focus:border-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Advanced Section Toggle */}
      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-accent"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Peaufiner les détails...
        </button>

        {showAdvanced && (
          <div className="animate-in fade-in zoom-in-95 mt-6 space-y-5 rounded-3xl border border-dashed border-gray-100 p-4 duration-300">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("dateLabel")}
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10"
                  />
                  <Calendar
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("timeLabel")}
                </Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10"
                  />
                  <Clock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t("addressLabel")}
              </Label>
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10"
                />
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {tShared("adultsLabel")}
                </Label>
                <Select value={String(adults)} onValueChange={(v) => setAdults(parseInt(v))}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100">
                    {Array.from({ length: 51 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i} {tShared("adultsCount", { count: i })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {tShared("childrenLabel")}
                </Label>
                <Select value={String(children)} onValueChange={(v) => setChildren(parseInt(v))}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100">
                    {Array.from({ length: 51 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i} {tShared("childrenCount", { count: i })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t("descriptionLabel")}
              </Label>
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="min-h-[80px] rounded-2xl border-gray-100 bg-gray-50/50 pl-10 pt-3"
                />
                <MessageSquare size={16} className="absolute left-3 top-4 text-gray-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Magic Button */}
      <div className="sticky bottom-0 bg-white/80 pb-2 pt-4 backdrop-blur-md">
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className={cn(
            "h-16 w-full rounded-[2rem] text-lg font-black transition-all active:scale-[0.98]",
            name.trim()
              ? "bg-accent text-white shadow-[0_20px_40px_-12px_rgba(var(--accent-rgb),0.4)] hover:bg-accent/90"
              : "bg-gray-100 text-gray-300"
          )}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              C'est parti ! <Sparkles size={18} className="ml-2" />
            </>
          )}
        </Button>
        {error && (
          <p className="mt-3 text-center text-xs font-bold text-red-500 animate-in fade-in slide-in-from-bottom-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 pb-4 text-left">
          <DrawerTitle className="text-xl font-black tracking-tight">{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none max-h-[85vh] overflow-y-auto overscroll-contain">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
