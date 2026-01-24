"use client";

import { useState, useEffect, useRef } from "react";
import { type Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const stateRef = useRef({ title, description, adults, children, peopleCount });

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
      adultsCount: _adultsCount, // Not used but present in some types
      peopleCount: currCount,
    } = stateRef.current as any;
    const hasChanged =
      currTitle !== (service?.title || "") ||
      currDescription !== (service?.description || "") ||
      currAdults !== (service?.adults || 0) ||
      currChildren !== (service?.children || 0) ||
      currCount !== (service?.peopleCount || 0);

    if (hasChanged && currTitle.trim()) {
      (onSubmit as any)(
        service.id,
        currTitle,
        currDescription,
        currAdults,
        currChildren,
        currCount
      );
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
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
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
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="service-description"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
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
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="edit-adults"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {tCommon("adultsLabel")}
          </Label>
          <Select
            value={String(adults)}
            onValueChange={(val) => {
              const v = parseInt(val);
              setAdults(v);
              setPeopleCount(v + children);
            }}
          >
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
            htmlFor="edit-children"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {tCommon("childrenLabel")}
          </Label>
          <Select
            value={String(children)}
            onValueChange={(val) => {
              const v = parseInt(val);
              setChildren(v);
              setPeopleCount(adults + v);
            }}
          >
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

      <div className="flex flex-col gap-3 pt-4">
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
