"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  UtensilsCrossed,
  Utensils,
  GlassWater,
  FilePlus,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  Sparkles,
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
}: {
  onSubmit: (
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
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
}) {
  const t = useTranslations("CreateEvent");
  const tShared = useTranslations("EventDashboard.Shared");
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [creationMode, setCreationMode] = useState<"total" | "classique" | "apero" | "zero">(
    "total"
  );
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(initialData?.time ?? "20:00");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [adults, setAdults] = useState(initialData?.adults ?? 2);
  const [children, setChildren] = useState(initialData?.children ?? 0);

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
      id: "zero",
      label: t("modeZeroLabel"),
      desc: t("modeZeroDesc"),
      icon: <FilePlus size={20} />,
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
      address
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
    <div className="flex flex-col gap-5 overscroll-contain sm:gap-4">
      {/* Progress indicator */}
      {!initialData && (
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500 sm:h-1.5",
                s <= step ? "bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      )}

      {showWarnings && step === 1 && (
        <div className="space-y-3 rounded-2xl border border-accent/10 bg-accent/5 p-4 sm:rounded-[24px]">
          <div className="flex gap-3 text-accent">
            <Sparkles size={20} className="shrink-0 sm:h-[18px] sm:w-[18px]" />
            <p className="text-sm font-medium leading-relaxed sm:text-xs">{t("warningAccount")}</p>
          </div>
        </div>
      )}

      {/* Step 1: L'Essentiel */}
      {step === 1 && (
        <div className="space-y-5 sm:space-y-4">
          <div className="space-y-2.5 sm:space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
              {t("eventNameLabel")}
            </Label>
            <div className="group relative">
              <Input
                className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 text-base transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/5 group-hover:border-gray-200 sm:h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("eventNamePlaceholder")}
                autoFocus
                autoCapitalize="sentences"
                enterKeyHint="next"
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
                  type="date"
                  className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 pr-4 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  enterKeyHint="next"
                />
                <Calendar
                  size={20}
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
                  type="time"
                  className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 pr-4 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  enterKeyHint="next"
                />
                <Clock
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2.5 sm:space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {tShared("adultsLabel")}
              </Label>
              <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
                <SelectTrigger className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-gray-400 sm:h-[18px] sm:w-[18px]" />
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
            <div className="space-y-2.5 sm:space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {tShared("childrenLabel")}
              </Label>
              <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
                <SelectTrigger className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-gray-400 sm:h-[18px] sm:w-[18px]" />
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
              className="h-14 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 hover:bg-gray-50 active:scale-95 sm:h-12"
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={initialData ? handleSubmit : goNext}
              disabled={!canGoNext() || isPending}
              className="h-14 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-95 sm:h-12"
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
        <div className="space-y-5 sm:space-y-4">
          <div className="space-y-2 pb-2 text-center">
            <h4 className="text-base font-bold text-gray-900 sm:text-sm">{t("menuDescription")}</h4>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-3">
            {CREATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCreationMode(mode.id)}
                className={cn(
                  "group flex touch-manipulation items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-300 active:scale-[0.98] sm:gap-3 sm:p-3",
                  creationMode === mode.id
                    ? "border-accent bg-accent/[0.03] shadow-lg shadow-accent/5"
                    : "border-gray-50 bg-gray-50/30 hover:border-gray-200 hover:bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] transition-colors duration-300 sm:h-12 sm:w-12",
                    creationMode === mode.id
                      ? "bg-accent text-white"
                      : "bg-white text-gray-400 shadow-sm group-hover:bg-accent/10 group-hover:text-accent"
                  )}
                >
                  <div className="h-6 w-6 sm:h-5 sm:w-5">{mode.icon}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-base font-bold transition-colors sm:text-sm",
                      creationMode === mode.id ? "text-accent" : "text-gray-900"
                    )}
                  >
                    {mode.label}
                  </span>
                  <span className="block truncate text-sm text-gray-500 sm:text-xs">
                    {mode.desc}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-6 sm:w-6",
                    creationMode === mode.id ? "border-accent bg-accent" : "border-gray-200"
                  )}
                >
                  {creationMode === mode.id && (
                    <div className="h-2.5 w-2.5 rounded-full bg-white sm:h-2 sm:w-2" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2.5 pt-2 sm:space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
              {t("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-12 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                autoComplete="street-address"
                autoCapitalize="sentences"
                enterKeyHint="next"
              />
              <MapPin
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3 sm:pt-2">
            <Button
              variant="outline"
              onClick={goBack}
              className="h-14 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 active:scale-95 sm:h-12"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={goNext}
              className="h-14 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 active:scale-95 sm:h-12"
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
                className="min-h-[100px] w-full touch-manipulation resize-none rounded-2xl border border-gray-100 bg-gray-50/50 p-4 pl-12 text-base outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:min-h-[80px] sm:pl-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                autoCapitalize="sentences"
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
              className="h-14 flex-1 touch-manipulation rounded-xl border-gray-100 font-bold text-gray-500 active:scale-95 sm:h-12"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="h-14 flex-[2] touch-manipulation rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 active:scale-95 sm:h-12"
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
