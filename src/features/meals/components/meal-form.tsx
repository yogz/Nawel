"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, type Locale } from "date-fns";
import { type Meal } from "@/lib/types";
import {
  Sparkles,
  ArrowLeft,
  CalendarIcon,
  Loader2,
  Trash2,
  UtensilsCrossed,
  Utensils,
  GlassWater,
  Clock,
  MapPin,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fr, enUS, el, de, es, pt } from "date-fns/locale";
import { DrawerClose } from "@/components/ui/drawer";

const dateLocales: Record<string, Locale> = {
  fr,
  en: enUS,
  el,
  de,
  es,
  pt,
};

export function MealForm({
  meal,
  defaultAdults = 0,
  defaultChildren = 0,
  defaultDate,
  defaultAddress,
  onSubmit,
  onDelete,
  onClose,
}: {
  meal?: Meal;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultDate?: string;
  defaultAddress?: string;
  onSubmit: (
    date: string,
    title: string,
    services?: string[],
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void | Promise<void>;
  onDelete?: (meal: Meal) => void;
  onClose: () => void;
}) {
  const t = useTranslations("EventDashboard.Meal");
  const tCommon = useTranslations("EventDashboard.Shared");
  const tCreateEvent = useTranslations("CreateEvent");
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";
  const _dateLocale = dateLocales[currentLocale] || fr;

  const CREATION_MODES = [
    {
      id: "total",
      label: tCreateEvent("modeTotalLabel"),
      desc: tCreateEvent("modeTotalDesc"),
      icon: <UtensilsCrossed size={20} />,
      services: ["apero", "entree", "plat", "fromage", "dessert", "boissons", "autre"],
    },
    {
      id: "classique",
      label: tCreateEvent("modeClassicLabel"),
      desc: tCreateEvent("modeClassicDesc"),
      icon: <Utensils size={20} />,
      services: ["entree", "plat", "dessert"],
    },
    {
      id: "apero",
      label: tCreateEvent("modeAperoLabel"),
      desc: tCreateEvent("modeAperoDesc"),
      icon: <GlassWater size={20} />,
      services: ["apero", "boissons"],
    },
    {
      id: "service-unique",
      label: tCreateEvent("modeServiceUniqueLabel"),
      desc: tCreateEvent("modeServiceUniqueDesc"),
      icon: <Utensils size={20} />,
      services: ["custom"],
    },
  ] as const;

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(
    meal?.date ? new Date(meal.date) : defaultDate ? new Date(defaultDate) : undefined
  );
  const [title, setTitle] = useState(meal?.title || "");
  const [adults, setAdults] = useState(meal?.adults ?? defaultAdults);
  const [children, setChildren] = useState(meal?.children ?? defaultChildren);
  const [time, setTime] = useState(meal?.time || "");
  const [address, setAddress] = useState(meal?.address || defaultAddress || "");
  const [isCommon, setIsCommon] = useState(meal?.date === "common");

  const addressRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [creationMode, setCreationMode] = useState<
    "total" | "classique" | "apero" | "service-unique"
  >("total");
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEditMode = !!meal;
  const skipSaveRef = useRef(false);
  const stateRef = useRef({ date, title, adults, children, time, address });

  useEffect(() => {
    stateRef.current = { date, title, adults, children, time, address };
  }, [date, title, adults, children, time, address]);

  const handleBlurSave = () => {
    if (!isEditMode || skipSaveRef.current) {
      return;
    }
    const {
      date: currDate,
      title: currTitle,
      adults: currAdults,
      children: currChildren,
      time: currTime,
      address: currAddress,
    } = stateRef.current;
    if (!isCommon && !currDate) {
      return;
    }

    const formattedDate = isCommon ? "common" : format(currDate!, "yyyy-MM-dd");
    const hasChanged =
      formattedDate !== (meal?.date || "") ||
      currTitle !== (meal?.title || "") ||
      currAdults !== (meal?.adults ?? defaultAdults) ||
      currChildren !== (meal?.children ?? defaultChildren) ||
      currTime !== (meal?.time || "") ||
      currAddress !== (meal?.address || "");

    if (hasChanged) {
      onSubmit(
        formattedDate,
        currTitle,
        undefined,
        currAdults,
        currChildren,
        currTime,
        currAddress
      );
    }
  };

  useEffect(() => {
    return () => {
      if (!skipSaveRef.current) {
        handleBlurSave();
      }
    };
  }, [isEditMode, meal, onSubmit, defaultAdults, defaultChildren]);

  const handleSubmit = async () => {
    if (!isCommon && !date) {
      return;
    }
    const formattedDate = isCommon ? "common" : format(date!, "yyyy-MM-dd");
    const finalTitle = title || (isCommon ? t("common") : "");

    // Pour la création, ne pas utiliser startTransition pour que le state se mette à jour immédiatement
    if (isEditMode) {
      startTransition(async () => {
        await onSubmit(formattedDate, finalTitle, undefined, adults, children, time, address);
      });
    } else {
      // Pour la création, appeler directement sans startTransition pour mise à jour immédiate
      const mode = CREATION_MODES.find((m) => m.id === creationMode);
      const servicesToCreate = mode ? [...mode.services] : [];
      await onSubmit(formattedDate, finalTitle, servicesToCreate, adults, children, time, address);
      // Fermer le drawer après la création pour que le state se mette à jour
      onClose();
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      return isCommon || !!date;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {!isEditMode && (
        <div className="mb-2 flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={clsx(
                "h-1 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-accent shadow-[0_0_8px_rgba(255,107,107,0.4)]" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border-2 border-gray-50 bg-gray-50/30 p-3 transition-colors hover:border-accent/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="block text-sm font-bold text-gray-900">{t("common")}</span>
                <span className="text-[10px] text-gray-500">{t("commonDesc")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCommon(!isCommon)}
              className={clsx(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                isCommon ? "bg-accent" : "bg-gray-200"
              )}
            >
              <span
                className={clsx(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  isCommon ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {t("titleLabel")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addressRef.current?.focus();
                }
              }}
              onBlur={handleBlurSave}
              placeholder={t("titlePlaceholder")}
              autoCapitalize="sentences"
              enterKeyHint="next"
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="address"
              className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              {t("addressLabel")}
            </Label>
            <div className="relative">
              <Input
                id="address"
                ref={addressRef}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    dateRef.current?.focus();
                  }
                }}
                onBlur={handleBlurSave}
                placeholder={t("addressPlaceholder")}
                autoComplete="street-address"
                autoCapitalize="sentences"
                enterKeyHint="next"
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 pl-10 text-base focus:bg-white focus:ring-accent/20"
              />
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {!isCommon && (
            <div className="flex gap-4">
              <div className="flex-[3] space-y-2">
                <Label
                  htmlFor="date"
                  className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
                >
                  {t("dateLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="date"
                    ref={dateRef}
                    type="date"
                    value={date ? format(date, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDate(val ? new Date(val) : undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        timeRef.current?.focus();
                      }
                    }}
                    onBlur={handleBlurSave}
                    className="h-14 w-full touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 pl-12 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-11"
                  />
                  <CalendarIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>

              <div className="flex-[2] space-y-2">
                <Label
                  htmlFor="time"
                  className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
                >
                  {t("timeLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="time"
                    ref={timeRef}
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (isEditMode) {
                          handleSubmit();
                        } else if (canGoNext()) {
                          setStep(2);
                        }
                      }
                    }}
                    enterKeyHint="next"
                    onBlur={handleBlurSave}
                    className="h-14 w-full touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 pl-12 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:pl-11"
                  />
                  <Clock className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
          )}

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

          <div
            className={clsx(
              "flex flex-col gap-3 pt-2",
              isEditMode && "mt-4 border-t border-gray-100 pt-6"
            )}
          >
            {!isEditMode && (
              <div className="flex gap-3">
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="premium"
                    className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
                  >
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                      {tCommon("cancel")}
                    </span>
                  </Button>
                </DrawerClose>
                <Button
                  type="button"
                  variant="premium"
                  onClick={() => setStep(2)}
                  disabled={!canGoNext()}
                  className="flex-[2] py-6 pr-8 shadow-md"
                  icon={<Sparkles size={18} />}
                  shine
                >
                  <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                    {tCommon("next")}
                  </span>
                </Button>
              </div>
            )}

            {isEditMode && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="group flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
                    <ChevronDown
                      className={clsx("h-3 w-3 transition-transform", showDetails && "rotate-180")}
                    />
                  </div>
                  {showDetails ? tCommon("showLess") : tCommon("showMore")}
                </button>

                {showDetails && (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    {onDelete && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="premium"
                          className="w-full border-red-100 bg-red-50/30"
                          icon={<Trash2 size={14} />}
                          iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                          onClick={() => {
                            skipSaveRef.current = true;
                            onDelete(meal);
                          }}
                        >
                          <span className="text-xs font-black uppercase tracking-widest text-red-600">
                            {t("deleteButton")}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && !isEditMode && (
        <div className="space-y-4">
          <div className="space-y-2 pb-2 text-center">
            <h4 className="text-sm font-bold text-gray-900">{tCreateEvent("menuDescription")}</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {CREATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCreationMode(mode.id)}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-300 active:scale-[0.98]",
                  creationMode === mode.id
                    ? "border-accent bg-accent/[0.03] shadow-lg shadow-accent/5"
                    : "border-gray-50 bg-gray-50/30 hover:scale-[1.01] hover:border-gray-200 hover:bg-white hover:shadow-md"
                )}
              >
                <div
                  className={clsx(
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
                    className={clsx(
                      "block text-sm font-bold transition-colors",
                      creationMode === mode.id ? "text-accent" : "text-gray-900"
                    )}
                  >
                    {mode.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{mode.desc}</span>
                </div>
                <div
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    creationMode === mode.id
                      ? "border-accent bg-accent"
                      : "border-gray-200 group-hover:border-gray-300"
                  )}
                >
                  {creationMode === mode.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="premium"
              onClick={() => setStep(1)}
              className="flex-1 py-6 pr-6 shadow-sm ring-1 ring-gray-100"
              icon={<ArrowLeft size={16} />}
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                {tCommon("back")}
              </span>
            </Button>
            <Button
              type="button"
              variant="premium"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-[2] py-6 pr-8 shadow-md"
              icon={isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              shine={!isPending}
            >
              <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                {isPending ? t("creating") : t("createButton")}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
