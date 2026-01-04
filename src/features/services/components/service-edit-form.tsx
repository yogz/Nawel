"use client";

import { useState, useEffect, useRef } from "react";
import { type Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ServiceEditForm({
  service,
  onSubmit,
  onDelete,
  onClose,
}: {
  service: Service;
  onSubmit: (
    id: number,
    title: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  onDelete: (service: Service) => void;
  onClose: () => void;
}) {
  const t = useTranslations("EventDashboard.ServiceForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const [title, setTitle] = useState(service?.title || "");
  const [adults, setAdults] = useState(service?.adults || 0);
  const [children, setChildren] = useState(service?.children || 0);
  const [peopleCount, setPeopleCount] = useState(service?.peopleCount || 0);
  const skipSaveRef = useRef(false);
  const stateRef = useRef({ title, adults, children, peopleCount });

  useEffect(() => {
    stateRef.current = { title, adults, children, peopleCount };
  }, [title, adults, children, peopleCount]);

  useEffect(() => {
    return () => {
      if (!skipSaveRef.current) {
        const {
          title: currTitle,
          adults: currAdults,
          children: currChildren,
          peopleCount: currCount,
        } = stateRef.current;
        const hasChanged =
          currTitle !== (service?.title || "") ||
          currAdults !== (service?.adults || 0) ||
          currChildren !== (service?.children || 0) ||
          currCount !== (service?.peopleCount || 0);

        if (hasChanged && currTitle.trim()) {
          onSubmit(service.id, currTitle, currAdults, currChildren, currCount);
        }
      }
    };
  }, [service, onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No longer needed since we save on close, but we keep the form element for layout
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          placeholder={t("placeholder")}
          required
          autoFocus
          autoCapitalize="sentences"
          enterKeyHint="done"
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

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="button"
          variant="premium"
          onClick={onClose}
          className="w-full py-6 pr-6 shadow-sm ring-1 ring-gray-100"
        >
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">
            {tCommon("close") || "Fermer"}
          </span>
        </Button>

        {onDelete && (
          <Button
            type="button"
            variant="premium"
            className="w-full border-red-100 bg-red-50/30"
            icon={<Trash2 size={16} />}
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
        )}
      </div>
    </form>
  );
}
