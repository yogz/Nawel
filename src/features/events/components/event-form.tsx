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
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [creationMode, setCreationMode] = useState<"total" | "classique" | "apero" | "vacation">(
    "total"
  );
  const [duration, setDuration] = useState(7);
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(initialData?.time ?? "20:00");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [adults, setAdults] = useState(initialData?.adults ?? 2);
  const [children, setChildren] = useState(initialData?.children ?? 0);

  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 3) {
      // Small timeout to ensure the transition is finished and keyboard is ready
      const timer = setTimeout(() => {
        descriptionRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const CREATION_MODES = [
    {
      id: "total",
      label: t("modeTotalLabel"),
      desc: t("modeTotalDesc"),
      icon: <UtensilsCrossed size={20} />,
    },
    {
      id: "classique",
      label: t("modeClassicLabel"),
      desc: t("modeClassicDesc"),
      icon: <Utensils size={20} />,
    },
    {
      id: "apero",
      label: t("modeAperoLabel"),
      desc: t("modeAperoDesc"),
      icon: <GlassWater size={20} />,
    },
    {
      id: "vacation",
      label: t("modeVacationLabel"),
      desc: t("modeVacationDesc"),
      icon: <Palmtree size={20} />,
    },
  ] as const;

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    // Note: slug is now auto-generated on server, we pass name as base slug hint
    onSubmit(
      name.trim(),
      description.trim() || undefined,
      creationMode,
      date,
      adults,
      children,
      time,
      address,
      duration
    );
  };

  const canGoNext = () => {
    if (step === 1) {
      return name.trim().length > 0 && date.length > 0;
    }
    return true;
  };

  const goNext = () => {
    if (step < 3 && canGoNext()) {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const selectedMode = CREATION_MODES.find((m) => m.id === creationMode);
  const stepTitles = [t("step1Title"), t("step2Title"), t("step3Title")];

  const content = (
    <div className="flex flex-col gap-4 overscroll-contain sm:gap-4">
      {/* Progress indicator */}
      {!initialData && (
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500 sm:h-1.5",
                s <= step ? "bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      )}

      {showWarnings && step === 1 && !isAuthenticated && (
        <div className="space-y-2 rounded-2xl border border-accent/10 bg-accent/5 p-3 sm:rounded-[24px]">
          <div className="flex gap-2 text-accent">
            <Sparkles size={18} className="shrink-0 sm:h-[18px] sm:w-[18px]" />
            <p className="text-xs font-medium leading-relaxed sm:text-xs">{t("warningAccount")}</p>
          </div>
        </div>
      )}

      {/* Step 1: L'Essentiel */}
      {step === 1 && (
        <div className="space-y-4 sm:space-y-4">
          <div className="space-y-2 sm:space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
              {t("eventNameLabel")}
            </Label>
            <div className="group relative">
              <Input
                ref={nameRef}
                className="h-12 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 text-base transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/5 group-hover:border-gray-200 sm:h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addressRef.current?.focus();
                  }
                }}
                placeholder={t("eventNamePlaceholder")}
                autoFocus
                autoCapitalize="sentences"
                enterKeyHint="next"
              />
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
              {t("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                ref={addressRef}
                className="h-12 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    dateRef.current?.focus();
                  }
                }}
                placeholder={t("addressPlaceholder")}
                autoComplete="street-address"
                autoCapitalize="sentences"
                enterKeyHint="next"
              />
              <MapPin
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {t("dateLabel")}
              </Label>
              <div className="relative">
                <Input
                  ref={dateRef}
                  type="date"
                  className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 pr-4 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      timeRef.current?.focus();
                    }
                  }}
                  enterKeyHint="next"
                />
                <Calendar
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {t("timeLabel")}
              </Label>
              <div className="relative">
                <Input
                  ref={timeRef}
                  type="time"
                  className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 pr-4 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (canGoNext()) {
                        if (initialData) {
                          handleSubmit();
                        } else {
                          goNext();
                        }
                      }
                    }
                  }}
                  enterKeyHint="next"
                />
                <Clock
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {tShared("adultsLabel")}
              </Label>
              <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
                <SelectTrigger className="h-12 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-gray-400 sm:h-[18px] sm:w-[18px]" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-[24px] border-gray-100 shadow-2xl">
                  {Array.from({ length: 101 }, (_, i) => (
                    <SelectItem
                      key={i}
                      value={String(i)}
                      className="rounded-xl py-3 text-base sm:py-2 sm:text-sm"
                    >
                      {i} {tShared("adultsCount", { count: i })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {tShared("childrenLabel")}
              </Label>
              <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
                <SelectTrigger className="h-12 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-gray-400 sm:h-[18px] sm:w-[18px]" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-[24px] border-gray-100 shadow-2xl">
                  {Array.from({ length: 101 }, (_, i) => (
                    <SelectItem
                      key={i}
                      value={String(i)}
                      className="rounded-xl py-3 text-base sm:py-2 sm:text-sm"
                    >
                      {i} {tShared("childrenCount", { count: i })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-3 sm:pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 hover:bg-gray-50 active:scale-95 sm:h-12"
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={initialData ? handleSubmit : goNext}
              disabled={!canGoNext() || isPending}
              className="h-12 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-95 sm:h-12"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin sm:h-[18px] sm:w-[18px]" />
              ) : initialData ? (
                tShared("save")
              ) : (
                t("nextButton")
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: L'Ambiance */}
      {step === 2 && (
        <div className="space-y-4 sm:space-y-3">
          <div className="pb-1 text-center sm:pb-2">
            <h4 className="text-sm font-bold text-gray-900 sm:text-sm">{t("menuDescription")}</h4>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:gap-2">
            {[
              { id: "group_standard", label: t("modeGroupStandard") },
              ...CREATION_MODES.filter((m) => !["vacation"].includes(m.id)),
              { id: "group_special", label: t("modeGroupSpecial") },
              ...CREATION_MODES.filter((m) => ["vacation"].includes(m.id)),
            ].map((item) => {
              if (item.id.startsWith("group_")) {
                return (
                  <div key={item.id} className="pb-1 pt-3 first:pt-0 sm:pb-0.5 sm:pt-2">
                    <h5 className="ml-1 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                      {item.label}
                    </h5>
                  </div>
                );
              }

              const mode = item as (typeof CREATION_MODES)[number];
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setCreationMode(mode.id)}
                  className={cn(
                    "group flex touch-manipulation items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-300 active:scale-[0.98] sm:gap-2.5 sm:rounded-2xl sm:p-2.5",
                    creationMode === mode.id
                      ? "border-accent bg-accent/[0.03] shadow-md shadow-accent/5"
                      : "border-gray-50 bg-gray-50/30 hover:border-gray-200 hover:bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 sm:h-10 sm:w-10 sm:rounded-[18px]",
                      creationMode === mode.id
                        ? "bg-accent text-white"
                        : "bg-white text-gray-400 shadow-sm group-hover:bg-accent/10 group-hover:text-accent"
                    )}
                  >
                    <div className="h-5 w-5 sm:h-4 sm:w-4">{mode.icon}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-bold transition-colors sm:text-sm",
                        creationMode === mode.id ? "text-accent" : "text-gray-900"
                      )}
                    >
                      {mode.label}
                    </span>
                    <span className="block truncate text-xs text-gray-500 sm:text-xs">
                      {mode.desc}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-5 sm:w-5",
                      creationMode === mode.id ? "border-accent bg-accent" : "border-gray-200"
                    )}
                  >
                    {creationMode === mode.id && (
                      <div className="h-2 w-2 rounded-full bg-white sm:h-1.5 sm:w-1.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {creationMode === "vacation" && (
            <div className="space-y-3 pt-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {t("durationLabel")}
              </Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 5, 7, 10, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-full border px-4 text-sm font-medium transition-all active:scale-95",
                        duration === d
                          ? "border-accent bg-accent text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-accent hover:bg-accent/5"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="relative flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    className="h-10 w-24 rounded-xl border-gray-100 bg-gray-50/50 px-3 text-center text-sm font-bold focus:bg-white"
                  />
                  <span className="text-sm font-medium text-gray-500">{t("durationLabel")}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3 sm:pt-2">
            <Button
              variant="outline"
              onClick={goBack}
              className="h-12 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 active:scale-95 sm:h-12"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={goNext}
              className="h-12 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 active:scale-95 sm:h-12"
            >
              {t("nextButton")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Finalisation */}
      {step === 3 && (
        <div className="space-y-5 sm:space-y-4">
          <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 sm:rounded-[32px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Sparkles size={18} className="sm:h-4 sm:w-4" />
                <span className="text-sm font-bold uppercase tracking-wider sm:text-xs">
                  {t("summaryEvent")}
                </span>
              </div>
              <span className="text-base font-black text-gray-900 sm:text-sm">{name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                  {t("summaryDate")}
                </span>
                <span className="text-base font-bold text-gray-700 sm:text-sm">
                  {new Date(date).toLocaleDateString(locale === "fr" ? "fr-FR" : locale, {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  à {time}
                </span>
              </div>
              <div className="space-y-1.5 sm:space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                  {t("summaryGuestsLabel")}
                </span>
                <span className="text-base font-bold text-gray-700 sm:text-sm">
                  {t("summaryGuests", { adults, children })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 sm:pt-1">
              <div className="space-y-1.5 sm:space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                  {t("summaryMenu")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 text-accent sm:h-4 sm:w-4">{selectedMode?.icon}</div>
                  <span className="text-base font-bold text-gray-700 sm:text-sm">
                    {selectedMode?.label}
                  </span>
                </div>
              </div>
              {address && (
                <div className="space-y-1.5 sm:space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                    {t("summaryAddress")}
                  </span>
                  <span className="block truncate text-base font-bold text-gray-700 sm:text-sm">
                    {address}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
              {t("descriptionLabel")}
            </Label>
            <div className="relative">
              <Textarea
                ref={descriptionRef}
                className="min-h-[100px] w-full touch-manipulation resize-none rounded-2xl border border-gray-100 bg-gray-50/50 p-4 pl-12 text-base outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:min-h-[80px] sm:pl-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (name.trim()) {
                      handleSubmit();
                    }
                  }
                }}
                placeholder={t("descriptionPlaceholder")}
                autoCapitalize="sentences"
                enterKeyHint="send"
              />
              <MessageSquare
                size={20}
                className="pointer-events-none absolute left-4 top-4 z-10 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-center text-sm font-bold text-red-500 sm:text-xs">
                {error === "Une erreur est survenue" ? t("errorDefault") : error}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={goBack}
              className="h-12 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 active:scale-95 sm:h-12"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="h-12 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 active:scale-95 sm:h-12"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin sm:h-[18px] sm:w-[18px]" />
              ) : (
                t("createButton")
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="px-4 sm:px-6">
        <DrawerHeader className="px-0 pb-3 text-left sm:pb-4">
          <DrawerTitle className="text-lg sm:text-xl">{stepTitles[step - 1]}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none min-h-[60vh] flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-8 sm:pb-20">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
