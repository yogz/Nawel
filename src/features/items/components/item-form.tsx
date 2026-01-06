"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { type Item, type Person, type Service, type Ingredient } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
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
import { Trash2, ChevronDown, Loader2, Plus, CircleHelp, Check, X } from "lucide-react";
import { DrawerClose } from "@/components/ui/drawer";
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
  // Current user for default person selection
  currentUserId,
}: {
  people: Person[];
  defaultItem?: Item;
  allServices?: Array<Service & { mealTitle: string }>;
  currentServiceId?: number;
  servicePeopleCount?: number;
  onSubmit: (values: {
    name: string;
    quantity?: string;
    note?: string;
    price?: number;
    personId?: number | null;
  }) => void;
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
  // Current user for default person selection
  currentUserId?: string;
}) {
  const t = useTranslations("EventDashboard.ItemForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const params = useParams();
  const locale = params.locale as string;

  const defaultNote =
    !defaultItem && servicePeopleCount ? t("defaultNote", { count: servicePeopleCount }) : "";

  // Detect if stored note is a translation key and re-translate it
  const getDisplayNote = (storedNote: string | null | undefined) => {
    if (!storedNote) {
      return defaultNote;
    }
    if (storedNote.startsWith("EventDashboard.")) {
      return t("defaultNote", { count: servicePeopleCount || 0 });
    }
    return storedNote;
  };

  const [name, setName] = useState(defaultItem?.name || "");
  const [quantity, setQuantity] = useState(defaultItem?.quantity || "");
  const [note, setNote] = useState(getDisplayNote(defaultItem?.note));
  const [price, setPrice] = useState(defaultItem?.price?.toString() || "");
  // Find person associated with current user for default selection
  const userPerson = currentUserId ? people.find((p) => p.userId === currentUserId) : undefined;
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(userPerson?.id ?? null);
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

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
    if (isPending) {
      return;
    }
    startTransition(() => {
      const values: {
        name: string;
        quantity?: string;
        note?: string;
        price?: number;
        personId?: number | null;
      } = {
        name,
        quantity: quantity || undefined,
        note: note || undefined,
        price: price ? parseFloat(price) : undefined,
      };
      if (!isEditMode) {
        values.personId = selectedPersonId;
      }
      onSubmit(values);
    });
  };

  const currentPersonId = isEditMode ? defaultItem.personId : selectedPersonId;

  const handlePersonClick = (personId: number | null) => {
    if (isEditMode) {
      onAssign(personId);
    } else {
      setSelectedPersonId(personId);
    }
  };

  const handleBlurSave = () => {
    if (!isEditMode || readOnly) {
      return;
    }

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
      onSubmit({
        name: currName,
        quantity: currQty || undefined,
        note: currNote || undefined,
        price: currPrice ? parseFloat(currPrice) : undefined,
      });
    }
  };

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <div className="space-y-5 sm:space-y-4">
      {/* Name - always visible */}
      <div className="space-y-2.5 sm:space-y-2">
        <Label
          htmlFor="item-name"
          className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
        >
          {t("label")}
        </Label>
        <Input
          id="item-name"
          placeholder={t("placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlurSave}
          disabled={readOnly}
          autoCapitalize="sentences"
          enterKeyHint="next"
          className="h-14 touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:text-base"
        />
      </div>

      {/* Note - moved out of more options */}
      <div className="space-y-2.5 sm:space-y-2">
        <Label
          htmlFor="item-note"
          className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
        >
          {t("note")}
        </Label>
        <Input
          id="item-note"
          placeholder={t("notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleBlurSave}
          disabled={readOnly}
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="h-14 touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-12 sm:text-base"
        />
      </div>

      {/* Quick details row */}
      <div className="flex gap-3 sm:gap-2">
        <Input
          placeholder={t("quantityPlaceholder")}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleBlurSave}
          disabled={readOnly}
          autoCapitalize="none"
          enterKeyHint="next"
          className="h-12 flex-1 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-11 sm:text-sm"
          aria-label={t("quantityLabel")}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder={t("pricePlaceholder")}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={handleBlurSave}
          disabled={readOnly}
          enterKeyHint="next"
          className="h-12 w-28 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-11 sm:w-24 sm:text-sm"
          aria-label={t("priceLabel")}
        />
      </div>

      {/* Assign to person - refined cards */}
      <div className="space-y-3 sm:space-y-2">
        <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
          {t("assignLabel")}
        </Label>
        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:gap-2 sm:pb-1">
          <button
            onClick={() => {
              triggerHaptic();
              handlePersonClick(null);
            }}
            aria-label={t("assignToUnassigned")}
            aria-pressed={!currentPersonId}
            className={clsx(
              "flex shrink-0 touch-manipulation snap-start flex-col items-center gap-2 rounded-[20px] p-3 transition-all active:scale-95 sm:gap-1.5 sm:p-2",
              !currentPersonId
                ? "bg-amber-50 ring-2 ring-amber-200"
                : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 active:bg-gray-100"
            )}
          >
            <div
              className={clsx(
                "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 sm:h-9 sm:w-9",
                !currentPersonId ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"
              )}
            >
              <CircleHelp size={20} className="sm:h-[18px] sm:w-[18px]" />
            </div>
            <span
              className={clsx(
                "whitespace-nowrap text-[10px] font-black uppercase tracking-widest sm:text-[9px]",
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
                onClick={() => {
                  triggerHaptic();
                  handlePersonClick(person.id);
                }}
                aria-label={t("assignToPerson", { name: getDisplayName(person) })}
                aria-pressed={isSelected}
                className={clsx(
                  "flex min-w-[72px] shrink-0 touch-manipulation snap-start flex-col items-center gap-2 rounded-[20px] p-3 transition-all active:scale-95 sm:min-w-[64px] sm:gap-1.5 sm:p-2",
                  isSelected
                    ? "bg-accent/5 ring-2 ring-accent/30"
                    : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 active:bg-gray-100"
                )}
              >
                <div
                  className={clsx(
                    "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-all duration-300 sm:h-9 sm:w-9",
                    isSelected ? "bg-accent text-white" : "bg-accent/10 text-accent"
                  )}
                >
                  {(() => {
                    const avatar = renderAvatar(
                      person,
                      people.map((p) => p.name)
                    );
                    if (avatar.type === "image") {
                      return (
                        <Image
                          src={avatar.src}
                          alt={getDisplayName(person)}
                          width={44}
                          height={44}
                          className="h-full w-full object-cover sm:h-9 sm:w-9"
                        />
                      );
                    }
                    return <span className="text-xl sm:text-lg">{avatar.value}</span>;
                  })()}
                </div>
                <span
                  className={clsx(
                    "max-w-[68px] truncate text-[10px] font-black uppercase tracking-widest sm:max-w-[60px] sm:text-[9px]",
                    isSelected ? "text-accent" : "text-gray-400"
                  )}
                >
                  {getDisplayName(person)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable details */}
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

      {/* Expandable details moved to bottom */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          setShowDetails(!showDetails);
        }}
        className="group flex w-full touch-manipulation items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600 active:scale-95 sm:gap-1.5 sm:py-1 sm:text-[10px]"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 transition-colors active:bg-gray-200 group-hover:bg-gray-200 sm:h-5 sm:w-5">
          <ChevronDown
            className={clsx(
              "h-3.5 w-3.5 transition-transform duration-300 sm:h-3 sm:w-3",
              showDetails && "rotate-180"
            )}
          />
        </div>
        {showDetails ? tCommon("showLess") : tCommon("showMore")}
      </button>

      {showDetails && (
        <div className="space-y-5 border-t border-gray-100 pt-5 sm:space-y-4 sm:pt-4">
          {isEditMode && allServices && allServices.length > 1 && (
            <div className="space-y-3 sm:space-y-2">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">
                {t("moveLabel")}
              </Label>
              <Select
                value={currentServiceId?.toString()}
                onValueChange={(val) => {
                  triggerHaptic();
                  onMoveService?.(Number(val));
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-14 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-11 sm:text-sm">
                  <SelectValue placeholder={t("movePlaceholder")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {allServices.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id.toString()}
                      className="py-3 text-base sm:py-2 sm:text-sm"
                    >
                      {s.mealTitle} • {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isEditMode && onDelete && (
            <div className="pt-3 sm:pt-2">
              <Button
                variant="premium"
                className="h-14 w-full touch-manipulation border-red-100 bg-red-50/30 active:scale-[0.98] sm:h-11"
                icon={<Trash2 size={16} className="sm:h-[14px] sm:w-[14px]" />}
                iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                onClick={() => {
                  triggerHaptic();
                  skipSaveRef.current = true;
                  onDelete();
                }}
                disabled={readOnly}
              >
                <span className="text-sm font-black uppercase tracking-widest text-red-600 sm:text-xs">
                  {tCommon("delete")}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons - only for creation */}
      {!isEditMode && (
        <div className="pt-6 sm:pt-4">
          <Button
            variant="premium"
            className="w-full touch-manipulation py-8 pr-8 shadow-md sm:py-7"
            icon={isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            onClick={() => {
              triggerHaptic();
              handleSubmit();
            }}
            disabled={readOnly || !name.trim() || isPending}
            shine={!isPending}
          >
            <span className="text-base font-black uppercase tracking-widest text-gray-700 sm:text-sm">
              {isPending ? t("adding") : t("addButton")}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
