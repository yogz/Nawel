"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Plus, UtensilsCrossed, Utensils, GlassWater, FilePlus, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
    slug: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string,
    adults?: number,
    children?: number
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
    slug: string;
  };
}) {
  const t = useTranslations("CreateEvent");
  const tShared = useTranslations("EventDashboard.Shared");
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [creationMode, setCreationMode] = useState<"total" | "classique" | "apero" | "zero">(
    "total"
  );
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split("T")[0]);
  const [customPassword, setCustomPassword] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(initialData ? true : false);
  const [adults, setAdults] = useState(initialData?.adults ?? 0);
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

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleSubmit = () => {
    if (!slug.trim() || !name.trim()) {
      return;
    }
    onSubmit(
      slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name.trim(),
      description.trim() || undefined,
      creationMode,
      date,
      customPassword.trim() || undefined,
      adults,
      children
    );
  };

  const canGoNext = () => {
    if (step === 1) {
      return name.trim().length > 0 && date.length > 0;
    }
    if (step === 2) {
      return true;
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
    <>
      {/* Progress indicator */}
      {!initialData && (
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? "bg-accent" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}

      {showWarnings && step === 1 && (
        <div className="mb-6 space-y-3">
          <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-amber-800">
            <div className="shrink-0 pt-0.5">⚠️</div>
            <p className="text-xs leading-relaxed">
              <strong>{t("summaryEvent")} :</strong> {t("warningLoss")}
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-blue-800">
            <div className="shrink-0 pt-0.5">✨</div>
            <p className="text-xs leading-relaxed">
              <strong>Note :</strong> {t("warningAccount")}
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Name & Date */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-gray-900">{t("eventNameLabel")}</span>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                if (!isSlugManuallyEdited) {
                  setSlug(generateSlug(newName));
                }
              }}
              placeholder={t("eventNamePlaceholder")}
              autoFocus
            />
          </label>

          {!initialData && (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-gray-900">{t("dateLabel")}</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="adults"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {tShared("adultsLabel")}
              </Label>
              <Select value={String(adults)} onValueChange={(val) => setAdults(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <SelectValue placeholder={tShared("adultsLabel")} />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
                  {Array.from({ length: 51 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {tShared("adultsCount", { count: i })}
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
                {tShared("childrenLabel")}
              </Label>
              <Select value={String(children)} onValueChange={(val) => setChildren(parseInt(val))}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white">
                  <SelectValue placeholder={tShared("childrenLabel")} />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[300px] rounded-2xl">
                  {Array.from({ length: 51 }, (_, i) => (
                    <SelectItem key={i} value={String(i)} className="rounded-xl">
                      {i} {tShared("childrenCount", { count: i })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              {t("cancelButton")}
            </button>
            <button
              type="button"
              onClick={initialData ? handleSubmit : goNext}
              disabled={!canGoNext() || isPending}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {tShared("saving")}
                </span>
              ) : initialData ? (
                tShared("save")
              ) : (
                t("nextButton")
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Creation Mode */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t("menuDescription")}</p>

          <div className="space-y-2">
            {CREATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCreationMode(mode.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  creationMode === mode.id
                    ? "border-accent bg-accent/5"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  {mode.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-bold ${creationMode === mode.id ? "text-accent" : "text-gray-700"}`}
                  >
                    {mode.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{mode.desc}</span>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    creationMode === mode.id ? "border-accent bg-accent" : "border-gray-300"
                  }`}
                >
                  {creationMode === mode.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              {t("backButton")}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95"
            >
              {t("nextButton")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("summaryEvent")}</span>
              <span className="text-sm font-bold text-gray-900">{name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("summaryDate")}</span>
              <span className="text-sm font-medium text-gray-700">
                {new Date(date).toLocaleDateString(locale === "fr" ? "fr-FR" : locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("summaryGuestsLabel")}</span>
              <span className="text-sm font-medium text-gray-700">
                {t("summaryGuests", { adults, children })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("summaryMenu")}</span>
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-accent">{selectedMode?.icon}</span>
                {selectedMode?.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("summaryUrl")}</span>
              <span className="font-mono text-sm text-accent">/{slug}</span>
            </div>
          </div>

          {/* Advanced options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            {showAdvanced ? t("hideOptions") : t("showOptions")}
          </button>

          {showAdvanced && (
            <div className="space-y-3 border-t border-gray-100 pt-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">{t("customUrlLabel")}</span>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value));
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder={t("customUrlPlaceholder")}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">{t("adminKeyLabel")}</span>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder={t("adminKeyPlaceholder")}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-600">{t("descriptionLabel")}</span>
                <textarea
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={2}
                />
              </label>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-500">
              {error === "Une erreur est survenue" ? t("errorDefault") : error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 active:scale-95"
            >
              {t("backButton")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !slug.trim() || !name.trim()}
              className="flex-[2] rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {t("creatingButton")}
                </span>
              ) : (
                t("createButton")
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (inline) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <BottomSheet open onClose={onClose} title={stepTitles[step - 1]}>
      {content}
    </BottomSheet>
  );
}
