"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { type Item, type Person, type Service, type Ingredient } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ChevronDown, Sparkles, Loader2, Plus, CircleHelp, Check } from "lucide-react";
import clsx from "clsx";
import { ItemIngredients } from "./item-ingredients";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export function ItemForm({
  people,
  defaultItem,
  allServices,
  currentServiceId,
  servicePeopleCount,
  onSubmit,
  onAssign,
  onMoveService,
  onDelete,
  readOnly,
  // Ingredient props
  ingredients,
  onGenerateIngredients,
  onToggleIngredient,
  onDeleteIngredient,
  onCreateIngredient,
  onDeleteAllIngredients,
  isGenerating,
  // Auth props for AI features
  isAuthenticated,
  onRequestAuth,
}: {
  people: Person[];
  defaultItem?: Item;
  allServices?: Array<Service & { mealTitle: string }>;
  currentServiceId?: number;
  servicePeopleCount?: number;
  onSubmit: (values: { name: string; quantity?: string; note?: string; price?: number }) => void;
  onAssign: (personId: number | null) => void;
  onMoveService?: (targetServiceId: number) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  // Ingredient props
  ingredients?: Ingredient[];
  onGenerateIngredients?: (name: string, note?: string, locale?: string) => Promise<void>;
  onToggleIngredient?: (id: number, checked: boolean) => void;
  onDeleteIngredient?: (id: number) => void;
  onCreateIngredient?: (name: string, quantity?: string) => void;
  onDeleteAllIngredients?: () => void;
  isGenerating?: boolean;
  // Auth props for AI features
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}) {
  const t = useTranslations("EventDashboard.ItemForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const params = useParams();
  const locale = params.locale as string;

  const defaultNote =
    !defaultItem && servicePeopleCount ? t("defaultNote", { count: servicePeopleCount }) : "";

  // Detect if stored note is a translation key and re-translate it
  const getDisplayNote = (storedNote: string | null | undefined) => {
    if (!storedNote) return defaultNote;
    if (storedNote.startsWith("EventDashboard.")) {
      return t("defaultNote", { count: servicePeopleCount || 0 });
    }
    return storedNote;
  };

  const [name, setName] = useState(defaultItem?.name || "");
  const [quantity, setQuantity] = useState(defaultItem?.quantity || "");
  const [note, setNote] = useState(getDisplayNote(defaultItem?.note));
  const [price, setPrice] = useState(defaultItem?.price?.toString() || "");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!defaultItem;

  // Ref to store latest onSubmit to avoid triggering effect on callback changes
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const stateRef = useRef({ name, quantity, note, price });
  const skipSaveRef = useRef(false);

  // Keep stateRef in sync for the unmount cleanup
  useEffect(() => {
    stateRef.current = { name, quantity, note, price };
  }, [name, quantity, note, price]);

  // Handle save on unmount (drawer close)
  useEffect(() => {
    return () => {
      if (isEditMode && !skipSaveRef.current && !readOnly) {
        const {
          name: currName,
          quantity: currQty,
          note: currNote,
          price: currPrice,
        } = stateRef.current;

        const hasChanges =
          currName !== (defaultItem?.name || "") ||
          currQty !== (defaultItem?.quantity || "") ||
          currNote !== getDisplayNote(defaultItem?.note) ||
          currPrice !== (defaultItem?.price?.toString() || "");

        if (hasChanges && currName.trim()) {
          onSubmitRef.current({
            name: currName,
            quantity: currQty || undefined,
            note: currNote || undefined,
            price: currPrice ? parseFloat(currPrice) : undefined,
          });
        }
      }
    };
  }, [isEditMode, readOnly, defaultItem]); // defaultItem is stable, readOnly/isEditMode too usually

  const hasChanged =
    isEditMode &&
    (name !== (defaultItem?.name || "") ||
      quantity !== (defaultItem?.quantity || "") ||
      note !== getDisplayNote(defaultItem?.note) ||
      price !== (defaultItem?.price?.toString() || ""));

  const handleSubmit = () => {
    onSubmit({
      name,
      quantity: quantity || undefined,
      note: note || undefined,
      price: price ? parseFloat(price) : undefined,
      personId: !isEditMode ? selectedPersonId : undefined,
    } as any);
  };

  const currentPersonId = isEditMode ? defaultItem.personId : selectedPersonId;

  const handlePersonClick = (personId: number | null) => {
    if (isEditMode) {
      onAssign(personId);
    } else {
      setSelectedPersonId(personId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Name - always visible */}
      <div className="space-y-2">
        <Label
          htmlFor="item-name"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          {t("label")}
        </Label>
        <Input
          id="item-name"
          placeholder={t("placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={readOnly}
          autoFocus={!defaultItem}
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
        />
      </div>

      {/* Quick details row */}
      <div className="flex gap-2">
        <Input
          placeholder={t("quantityPlaceholder")}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={readOnly}
          className="h-11 flex-1 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
          aria-label={t("quantityLabel")}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder={t("pricePlaceholder")}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={readOnly}
          className="h-11 w-24 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
          aria-label={t("priceLabel")}
        />
      </div>

      {/* Assign to person - refined cards */}
      <div className="space-y-2">
        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
          {t("assignLabel")}
        </Label>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => handlePersonClick(null)}
            className={clsx(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-[20px] p-2 transition-all active:scale-95",
              !currentPersonId
                ? "bg-amber-50 ring-2 ring-amber-200"
                : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
            )}
          >
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                !currentPersonId ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"
              )}
            >
              <CircleHelp size={18} />
            </div>
            <span
              className={clsx(
                "whitespace-nowrap text-[9px] font-black uppercase tracking-widest",
                !currentPersonId ? "text-amber-900" : "text-gray-400"
              )}
            >
              {t("unassigned")}
            </span>
          </button>
          {people.map((person) => {
            const isSelected = currentPersonId === person.id;
            return (
              <button
                key={person.id}
                onClick={() => handlePersonClick(person.id)}
                className={clsx(
                  "flex min-w-[64px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] p-2 transition-all active:scale-95",
                  isSelected
                    ? "bg-accent/5 ring-2 ring-accent/30"
                    : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
                )}
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-all duration-300",
                    isSelected ? "bg-accent text-white" : "bg-accent/10 text-accent"
                  )}
                >
                  {person.user?.image ? (
                    <Image
                      src={person.user.image}
                      alt={person.name}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">
                      {getPersonEmoji(
                        person.name,
                        people.map((p) => p.name),
                        person.emoji
                      )}
                    </span>
                  )}
                </div>
                <span
                  className={clsx(
                    "max-w-[60px] truncate text-[9px] font-black uppercase tracking-widest",
                    isSelected ? "text-accent" : "text-gray-400"
                  )}
                >
                  {person.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable details */}
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
          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t("note")}
            </Label>
            <Input
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              className="h-11 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
            />
          </div>

          {isEditMode && allServices && allServices.length > 1 && (
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t("moveLabel")}
              </Label>
              <Select
                value={currentServiceId?.toString()}
                onValueChange={(val) => onMoveService?.(Number(val))}
                disabled={readOnly}
              >
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white">
                  <SelectValue placeholder={t("movePlaceholder")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {allServices.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.mealTitle} • {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isEditMode && onDelete && (
            <div className="pt-2">
              <Button
                variant="premium"
                className="w-full border-red-100 bg-red-50/30"
                icon={<Trash2 size={14} />}
                iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                onClick={() => {
                  skipSaveRef.current = true;
                  onDelete();
                }}
                disabled={readOnly}
              >
                <span className="text-xs font-black uppercase tracking-widest text-red-600">
                  {tCommon("delete")}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* AI Ingredients section - only for existing items */}
      {isEditMode && (
        <ItemIngredients
          ingredients={ingredients}
          itemName={name}
          itemNote={note}
          isGenerating={isGenerating}
          isAuthenticated={isAuthenticated}
          onGenerateIngredients={
            onGenerateIngredients ? (n, o) => onGenerateIngredients(n, o, locale) : undefined
          }
          onToggleIngredient={onToggleIngredient}
          onDeleteIngredient={onDeleteIngredient}
          onCreateIngredient={onCreateIngredient}
          onDeleteAllIngredients={onDeleteAllIngredients}
          onRequestAuth={onRequestAuth}
        />
      )}

      {/* Action buttons - only for creation */}
      {!isEditMode && (
        <div className="pt-4">
          <Button
            variant="premium"
            className="w-full py-7 pr-8 shadow-md"
            icon={<Plus />}
            onClick={handleSubmit}
            disabled={readOnly || !name.trim()}
            shine
          >
            <span className="text-sm font-black uppercase tracking-widest text-gray-700">
              {t("addButton")}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
