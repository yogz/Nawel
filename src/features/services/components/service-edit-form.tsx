"use client";

import { useState, useEffect, useRef } from "react";
import { type Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { useTranslatedServiceTitle } from "@/hooks/use-translated-service-title";

export function ServiceEditForm({
  service,
  onSubmit,
  onDelete,
  onClose: _onClose,
}: {
  service: Service;
  onSubmit: (
    id: number,
    title: string,
    description?: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  onDelete: (service: Service) => void;
  onClose: () => void;
}) {
  const t = useTranslations("EventDashboard.ServiceForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const tMeal = useTranslations("EventDashboard.Meal");

  const translatedTitle = useTranslatedServiceTitle(service?.title || "");

  // Translate description if it matches a known key pattern (desc_*)
  const initialDescription = (() => {
    const desc = service?.description || "";
    if (desc.startsWith("desc_")) {
      try {
        return tMeal(`serviceTypes.${desc}`);
      } catch {
        return desc;
      }
    }
    return desc;
  })();

  const [title, setTitle] = useState(translatedTitle);
  const [description, setDescription] = useState(initialDescription);
  const [adults, setAdults] = useState(service?.adults || 0);
  const [children, setChildren] = useState(service?.children || 0);
  const [peopleCount, setPeopleCount] = useState(service?.peopleCount || 0);
  const [showDetails, setShowDetails] = useState(false);
  const skipSaveRef = useRef(false);
  const stateRef = useRef<{
    title: string;
    description: string;
    adults: number;
    children: number;
    peopleCount: number;
  }>({ title, description, adults, children, peopleCount });

  useEffect(() => {
    stateRef.current = { title, description, adults, children, peopleCount };
  }, [title, description, adults, children, peopleCount]);

  const handleBlurSave = () => {
    if (skipSaveRef.current) {
      return;
    }
    const {
      title: currTitle,
      description: currDescription,
      adults: currAdults,
      children: currChildren,
      peopleCount: currCount,
    } = stateRef.current;
    const hasChanged =
      currTitle !== (service?.title || "") ||
      currDescription !== (service?.description || "") ||
      currAdults !== (service?.adults || 0) ||
      currChildren !== (service?.children || 0) ||
      currCount !== (service?.peopleCount || 0);

    if (hasChanged && currTitle.trim()) {
      onSubmit(service.id, currTitle, currDescription, currAdults, currChildren, currCount);
    }
  };

  useEffect(() => {
    return () => {
      handleBlurSave();
    };
  }, [service, onSubmit]);

  const _handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No longer needed since we save on close, but we keep the form element for layout
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="service-title"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500"
        >
          {t("label")}
        </Label>
        <Input
          id="service-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlurSave}
          placeholder={t("placeholder")}
          required
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus:bg-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="service-description"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500"
        >
          {t("descriptionLabel") || "Description (ex: Apéro, Entrées...)"}
        </Label>
        <Input
          id="service-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlurSave}
          placeholder={t("descriptionPlaceholder") || "Détails du service"}
          autoCapitalize="sentences"
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus:bg-zinc-800"
        />
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="group flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
            <ChevronDown
              className={clsx("h-3 w-3 transition-transform", showDetails && "rotate-180")}
            />
          </div>
          {showDetails ? tCommon("showLess") : tCommon("showMore")}
        </button>

        {showDetails && (
          <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-zinc-700">
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
                    onDelete(service);
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
    </div>
  );
}
