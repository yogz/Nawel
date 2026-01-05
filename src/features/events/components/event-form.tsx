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
    <div className="flex flex-col gap-4">
      {/* Progress indicator */}
      {!initialData && (
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      )}

      {showWarnings && step === 1 && (
        <div className="space-y-3 rounded-[24px] border border-accent/10 bg-accent/5 p-4">
          <div className="flex gap-3 text-accent">
            <Sparkles size={18} className="shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{t("warningAccount")}</p>
          </div>
        </div>
      )}

      {/* Step 1: L'Essentiel */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t("eventNameLabel")}
            </Label>
            <div className="group relative">
              <Input
                className="h-12 rounded-xl border-gray-100 bg-gray-50/50 px-4 text-base transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/5 group-hover:border-gray-200"
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
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t("dateLabel")}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  className="h-12 rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-10 pr-4 text-base focus:bg-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  enterKeyHint="next"
                />
                <Calendar
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t("timeLabel")}
              </Label>
              <div className="relative">
                <Input
                  type="time"
                  className="h-12 rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-10 pr-4 text-base focus:bg-white"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  enterKeyHint="next"
                />
                <Clock
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {tShared("adultsLabel")}
              </Label>
              <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-[24px] border-gray-100 shadow-2xl">
                  {Array.from({ length: 101 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {tShared("adultsCount", { count: i })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {tShared("childrenLabel")}
              </Label>
              <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-[24px] border-gray-100 shadow-2xl">
                  {Array.from({ length: 101 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {tShared("childrenCount", { count: i })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl border-gray-100 font-bold text-gray-500 hover:bg-gray-50"
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={initialData ? handleSubmit : goNext}
              disabled={!canGoNext() || isPending}
              className="h-12 flex-[2] rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent/90"
            >
              {isPending ? (
                <Loader2 size={18} className="animate-spin" />
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
        <div className="space-y-4">
          <div className="space-y-2 pb-2 text-center">
            <h4 className="text-sm font-bold text-gray-900">{t("menuDescription")}</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {CREATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCreationMode(mode.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-300",
                  creationMode === mode.id
                    ? "border-accent bg-accent/[0.03] shadow-lg shadow-accent/5"
                    : "border-gray-50 bg-gray-50/30 hover:border-gray-200 hover:bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition-colors duration-300",
                    creationMode === mode.id
                      ? "bg-accent text-white"
                      : "bg-white text-gray-400 shadow-sm group-hover:bg-accent/10 group-hover:text-accent"
                  )}
                >
                  {mode.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-bold transition-colors",
                      creationMode === mode.id ? "text-accent" : "text-gray-900"
                    )}
                  >
                    {mode.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{mode.desc}</span>
                </div>
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    creationMode === mode.id ? "border-accent bg-accent" : "border-gray-200"
                  )}
                >
                  {creationMode === mode.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                className="h-12 rounded-xl border-gray-100 bg-gray-50/50 px-4 pl-10 text-base focus:bg-white"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                autoComplete="street-address"
                autoCapitalize="sentences"
                enterKeyHint="next"
              />
              <MapPin
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={goBack}
              className="h-12 flex-1 rounded-xl border-gray-100 font-bold text-gray-500"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={goNext}
              className="h-12 flex-[2] rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20"
            >
              {t("nextButton")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Finalisation */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-[32px] border border-gray-100 bg-gray-50/50 p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t("summaryEvent")}
                </span>
              </div>
              <span className="text-sm font-black text-gray-900">{name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t("summaryDate")}
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {new Date(date).toLocaleDateString(locale === "fr" ? "fr-FR" : locale, {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  à {time}
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t("summaryGuestsLabel")}
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {t("summaryGuests", { adults, children })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t("summaryMenu")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="text-accent">{selectedMode?.icon}</div>
                  <span className="text-sm font-bold text-gray-700">{selectedMode?.label}</span>
                </div>
              </div>
              {address && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {t("summaryAddress")}
                  </span>
                  <span className="block truncate text-sm font-bold text-gray-700">{address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t("descriptionLabel")}
            </Label>
            <div className="relative">
              <Textarea
                className="min-h-[80px] w-full resize-none rounded-2xl border border-gray-100 bg-gray-50/50 p-4 pl-10 text-base outline-none transition-all focus:border-accent focus:bg-white"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                autoCapitalize="sentences"
              />
              <MessageSquare
                size={18}
                className="pointer-events-none absolute left-3.5 top-4 text-gray-400"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-center text-xs font-bold text-red-500">
                {error === "Une erreur est survenue" ? t("errorDefault") : error}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={goBack}
              className="h-12 flex-1 rounded-xl border-gray-100 font-bold text-gray-500"
            >
              {t("backButton")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="h-12 flex-[2] rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/20"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : t("createButton")}
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
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{stepTitles[step - 1]}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none flex-1 overflow-y-auto pb-40">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
