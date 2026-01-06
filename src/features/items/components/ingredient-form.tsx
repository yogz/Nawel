"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";

interface IngredientFormProps {
  onSubmit: (name: string, quantity?: string) => void;
  onCancel: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function IngredientForm({
  onSubmit,
  onCancel,
  className,
  autoFocus = false,
}: IngredientFormProps) {
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const tShared = useTranslations("EventDashboard.Shared");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), quantity.trim() || undefined);
      setName("");
      setQuantity("");
    }
  };

  return (
    <div className={clsx("space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3", className)}>
      <Input
        placeholder={t("namePlaceholder")}
        aria-label={t("nameLabel")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-12 rounded-xl"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus={autoFocus}
      />
      <Input
        placeholder={t("quantityPlaceholder")}
        aria-label={t("quantityLabel")}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="h-12 rounded-xl"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-50"
        >
          {t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label={tShared("cancel") || "Annuler"}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-500 transition-all hover:bg-gray-100 active:scale-95"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
