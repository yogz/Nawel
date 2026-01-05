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
  Check,
  CalendarIcon,
  Loader2,
  Trash2,
  UtensilsCrossed,
  Salad,
  GlassWater,
  Cake,
  Wine,
  Package,
  CircleDot,
  Plus,
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
  onSubmit,
  onDelete,
  onClose,
}: {
  meal?: Meal;
  defaultAdults?: number;
  defaultChildren?: number;
  onSubmit: (
    date: string,
    title: string,
    services?: string[],
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
  onDelete?: (meal: Meal) => void;
  onClose: () => void;
}) {
  const t = useTranslations("EventDashboard.Meal");
  const tCommon = useTranslations("EventDashboard.Shared");
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";
  const dateLocale = dateLocales[currentLocale] || fr;

  const DEFAULT_SERVICE_TYPES = [
    { id: "apero", label: t("serviceTypes.apero"), icon: <GlassWater size={20} /> },
    { id: "entree", label: t("serviceTypes.entree"), icon: <Salad size={20} /> },
    { id: "plat", label: t("serviceTypes.plat"), icon: <UtensilsCrossed size={20} /> },
    { id: "fromage", label: t("serviceTypes.fromage"), icon: <CircleDot size={20} /> },
    { id: "dessert", label: t("serviceTypes.dessert"), icon: <Cake size={20} /> },
    { id: "boisson", label: t("serviceTypes.boisson"), icon: <Wine size={20} /> },
    { id: "autre", label: t("serviceTypes.autre"), icon: <Package size={20} /> },
  ];

  const QUICK_OPTIONS = [
    {
      id: "apero",
      label: t("serviceTypes.apero"),
      icon: <GlassWater size={20} />,
      services: [t("serviceTypes.boissons"), t("serviceTypes.apero")],
    },
    {
      id: "entree",
      label: t("serviceTypes.entree"),
      icon: <Salad size={20} />,
      services: [t("serviceTypes.entree")],
    },
    {
      id: "plat",
      label: t("serviceTypes.plat"),
      icon: <UtensilsCrossed size={20} />,
      services: [t("serviceTypes.plat")],
    },
    {
      id: "dessert",
      label: t("serviceTypes.dessert"),
      icon: <Cake size={20} />,
      services: [t("serviceTypes.dessert")],
    },
    {
      id: "fromage",
      label: t("serviceTypes.fromage"),
      icon: <CircleDot size={20} />,
      services: [t("serviceTypes.fromage")],
    },
    {
      id: "boissons",
      label: t("serviceTypes.boissons"),
      icon: <Wine size={20} />,
      services: [t("serviceTypes.boissons")],
    },
    {
      id: "autre",
      label: t("serviceTypes.autre"),
      icon: <Package size={20} />,
      services: [t("serviceTypes.divers")],
    },
    {
      id: "custom",
      label: t("serviceTypes.custom"),
      icon: <Plus size={20} />,
      services: [],
    },
  ] as const;

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(meal?.date ? new Date(meal.date) : undefined);
  const [title, setTitle] = useState(meal?.title || "");
  const [adults, setAdults] = useState(meal?.adults ?? defaultAdults);
  const [children, setChildren] = useState(meal?.children ?? defaultChildren);
  const [time, setTime] = useState(meal?.time || "");
  const [address, setAddress] = useState(meal?.address || "");
  const [quickOption, setQuickOption] = useState<string>("plat");
  const [selectedServices, setSelectedServices] = useState<string[]>(["plat"]);
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
    if (!currDate) {
      return;
    }

    const formattedDate = format(currDate, "yyyy-MM-dd");
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

  const handleSubmit = () => {
    if (!date || isPending) {
      return;
    }
    const formattedDate = format(date, "yyyy-MM-dd");

    startTransition(() => {
      if (isEditMode) {
        onSubmit(formattedDate, title, undefined, adults, children, time, address);
      } else {
        let servicesToCreate: string[];
        if (quickOption === "custom") {
          servicesToCreate = selectedServices.map(
            (id) => DEFAULT_SERVICE_TYPES.find((m) => m.id === id)?.label || id
          );
        } else {
          const option = QUICK_OPTIONS.find((o) => o.id === quickOption);
          servicesToCreate = option ? [...option.services] : ["Service"];
        }
        onSubmit(formattedDate, title, servicesToCreate, adults, children, time, address);
      }
    });
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const canGoNext = () => {
    if (step === 1) {
      return !!date;
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
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

          <div className="flex gap-4">
            <div className="flex-[3] space-y-2">
              <Label
                htmlFor="date"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("dateLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={date ? format(date, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDate(val ? new Date(val) : undefined);
                  }}
                  onBlur={handleBlurSave}
                  className="h-12 w-full rounded-2xl border-gray-100 bg-gray-50/50 pl-11 text-base focus:bg-white focus:ring-accent/20"
                />
                <CalendarIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="flex-[2] space-y-2">
              <Label
                htmlFor="time"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("timeLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  enterKeyHint="next"
                  onBlur={handleBlurSave}
                  className="h-12 w-full rounded-2xl border-gray-100 bg-gray-50/50 pl-11 text-base focus:bg-white focus:ring-accent/20"
                />
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

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
                  className="group flex items-center gap-1.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
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
          <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t("organisationLabel")}
          </Label>

          <div className="space-y-3">
            {QUICK_OPTIONS.map((opt) => {
              const isSelected = quickOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuickOption(opt.id)}
                  className={clsx(
                    "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                    isSelected
                      ? "border-accent bg-accent/5 shadow-sm ring-1 ring-accent/20"
                      : "border-gray-50 bg-white hover:border-gray-200"
                  )}
                >
                  <div
                    className={clsx(
                      "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all duration-300",
                      isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-gray-100"
                    )}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <span
                      className={clsx(
                        "block text-sm font-black uppercase tracking-widest",
                        isSelected ? "text-accent" : "text-gray-700"
                      )}
                    >
                      {opt.label}
                    </span>
                    {opt.services.length > 0 && (
                      <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
                        {opt.services.join(" • ")}
                      </span>
                    )}
                  </div>
                  <div
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isSelected ? "border-accent bg-accent" : "border-gray-200 bg-white"
                    )}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>

          {quickOption === "custom" && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t("serviceSelectionLabel")}
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEFAULT_SERVICE_TYPES.map((type) => {
                  const isSelected = selectedServices.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleService(type.id)}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border-2 p-2 text-left transition-all active:scale-95",
                        isSelected
                          ? "border-accent bg-accent/5 text-accent shadow-sm"
                          : "border-gray-50 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <div
                        className={clsx(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all",
                          isSelected
                            ? "bg-accent text-white shadow-md shadow-accent/20"
                            : "bg-gray-100"
                        )}
                      >
                        {type.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              disabled={(quickOption === "custom" && selectedServices.length === 0) || isPending}
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
