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
import { Trash2, ChevronDown, Loader2, Plus, CircleHelp, Sparkles, Lock } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export function ItemForm({
  people,
  defaultItem,
  allServices,
  currentServiceId,
  servicePeopleCount,
  smartCount,
  countSource,
  onSubmit,
  onAssign,
  onMoveService,
  onDelete,
  readOnly,
  // Ingredient props
  ingredients,
  onGenerateIngredients,
  onToggleIngredient: _onToggleIngredient,
  onDeleteIngredient: _onDeleteIngredient,
  onCreateIngredient: _onCreateIngredient,
  onDeleteAllIngredients: _onDeleteAllIngredients,
  onManageIngredients,
  isGenerating,
  // Auth props for AI features
  isAuthenticated,
  isEmailVerified,
  onRequestAuth,
  // Current user for default person selection
  currentUserId,
}: {
  people: Person[];
  defaultItem?: Item;
  allServices?: Array<Service & { mealTitle: string }>;
  currentServiceId?: number;
  servicePeopleCount?: number;
  smartCount?: number;
  countSource?: string;
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
  onGenerateIngredients?: (name: string, note?: string, manualCount?: number) => Promise<void>;
  onToggleIngredient?: (id: number, checked: boolean) => void;
  onDeleteIngredient?: (id: number) => void;
  onCreateIngredient?: (name: string, quantity?: string) => void;
  onDeleteAllIngredients?: () => void;
  onManageIngredients?: () => void;
  isGenerating?: boolean;
  // Auth props for AI features
  isAuthenticated?: boolean;
  isEmailVerified?: boolean;
  onRequestAuth?: () => void;
  // Current user for default person selection
  currentUserId?: string;
}) {
  const t = useTranslations("EventDashboard.ItemForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const params = useParams();
  const locale = params.locale as string;
  const tActions = useTranslations("Translations.actions");

  const defaultNote = "";

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
  const [isEditingCount, setIsEditingCount] = useState(false);
  const [manualCount, setManualCount] = useState<string>("");

  const _timerRef = useRef<NodeJS.Timeout | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
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

  const _hasChanged =
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
    <div className="space-y-4 sm:space-y-3">
      {/* Name - always visible */}
      <div className="space-y-1 sm:space-y-1">
        <Label
          htmlFor="item-name"
          className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
        >
          {t("label")}
        </Label>
        <Input
          id="item-name"
          ref={nameRef}
          placeholder={t("placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlurSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              noteRef.current?.focus();
            }
          }}
          disabled={readOnly}
          autoCapitalize="sentences"
          enterKeyHint="next"
          className="h-12 touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-10 sm:text-base"
        />
      </div>

      {/* Note - moved out of more options */}
      <div className="space-y-1 sm:space-y-1">
        <Label
          htmlFor="item-note"
          className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]"
        >
          {t("note")}
        </Label>
        <Input
          id="item-note"
          ref={noteRef}
          placeholder={t("notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleBlurSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (isEditMode) {
                // In edit mode, Enter on note can just blur to save or move to next
                qtyRef.current?.focus();
              } else {
                // In create mode, if we have a name, Entre on note can submit
                if (name.trim()) {
                  handleSubmit();
                } else {
                  qtyRef.current?.focus();
                }
              }
            }
          }}
          disabled={readOnly}
          autoCapitalize="sentences"
          enterKeyHint="next"
          className="h-12 touch-manipulation rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-10 sm:text-base"
        />
      </div>

      {/* Quick details row */}
      <div className="flex gap-2 sm:gap-2">
        <Input
          ref={qtyRef}
          placeholder={t("quantityPlaceholder")}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleBlurSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              priceRef.current?.focus();
            }
          }}
          disabled={readOnly}
          autoCapitalize="none"
          enterKeyHint="next"
          className="h-11 flex-1 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-9 sm:text-sm"
          aria-label={t("quantityLabel")}
        />
        <Input
          ref={priceRef}
          type="number"
          inputMode="decimal"
          placeholder={t("pricePlaceholder")}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={handleBlurSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (!isEditMode && name.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }
          }}
          disabled={readOnly}
          enterKeyHint="done"
          className="h-11 w-28 touch-manipulation rounded-xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-9 sm:w-24 sm:text-sm"
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
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 sm:h-8 sm:w-8",
                !currentPersonId ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"
              )}
            >
              <CircleHelp size={18} className="sm:h-4 sm:w-4" />
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
                  "flex min-w-[68px] shrink-0 touch-manipulation snap-start flex-col items-center gap-2 rounded-[20px] p-2.5 transition-all active:scale-95 sm:min-w-[60px] sm:gap-1.5 sm:p-2",
                  isSelected
                    ? "bg-accent/5 ring-2 ring-accent/30"
                    : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 active:bg-gray-100"
                )}
              >
                <div
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-all duration-300 sm:h-8 sm:w-8",
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
                          width={40}
                          height={40}
                          className="h-full w-full object-cover sm:h-8 sm:w-8"
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
      {/* Ingredients Section - Simplified for Mobile First */}
      {isEditMode && (
        <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-gray-50/50 p-3.5 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  {t("Ingredients.count", { count: ingredients?.length || 0 })}
                </Label>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onManageIngredients}
              className="rounded-xl border-gray-200 bg-white px-4 text-xs font-bold uppercase tracking-widest text-accent shadow-sm active:scale-95"
            >
              {ingredients && ingredients.length > 0 ? tCommon("edit") : t("Ingredients.add")}
            </Button>
          </div>

          {/* Quick preview of ingredients OR AI Button */}
          {ingredients && ingredients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ingredients.map((ing) => (
                <span
                  key={ing.id}
                  className={clsx(
                    "rounded-lg px-2 py-1 text-[10px] font-medium",
                    ing.checked
                      ? "bg-green-100 text-green-700 line-through"
                      : "border border-gray-100 bg-white text-gray-600"
                  )}
                >
                  {ing.name}
                  {ing.quantity && ` (${ing.quantity})`}
                </span>
              ))}
            </div>
          ) : (
            <div className="pt-1">
              {!isAuthenticated ? (
                <Button
                  onClick={onRequestAuth}
                  variant="outline"
                  className="h-11 w-full gap-2 rounded-xl border border-dashed border-purple-200 bg-purple-50 text-[10px] font-bold uppercase tracking-tight text-purple-600"
                >
                  <Lock size={12} />
                  {t("Ingredients.authRequired")}
                </Button>
              ) : !isEmailVerified ? (
                <div className="flex w-full flex-col items-center gap-1.5">
                  <Button
                    disabled
                    variant="outline"
                    className="h-auto min-h-11 w-full gap-2 whitespace-normal rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-2 text-[10px] font-bold uppercase tracking-tight text-red-600"
                  >
                    <Lock size={12} className="shrink-0" />
                    <span>{tActions("emailNotVerifiedAI")}</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Smart Count UI with Interactivity */}
                  <div className="flex items-center justify-between px-1">
                    {isEditingCount ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          ref={countRef}
                          type="number"
                          value={manualCount}
                          onChange={(e) => setManualCount(e.target.value)}
                          placeholder={String(smartCount || 4)}
                          className="h-8 w-16 rounded-lg border-accent/20 bg-white text-center text-xs font-bold text-accent focus:ring-accent/20"
                          onBlur={() => {
                            if (!manualCount) setIsEditingCount(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onGenerateIngredients?.(
                                name,
                                note,
                                manualCount ? parseInt(manualCount) : undefined
                              );
                            }
                          }}
                        />
                        <span className="text-[10px] font-medium text-gray-400">pers.</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setManualCount(String(smartCount || 4));
                          setIsEditingCount(true);
                        }}
                        className="group flex items-center gap-1.5 rounded-lg py-1 px-2 transition-colors hover:bg-gray-100"
                        title={t("Ingredients.smartCountTooltip", {
                          source: countSource || "default",
                        })}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-accent">
                          {t("Ingredients.generateFor", {
                            count: manualCount ? parseInt(manualCount) : smartCount || 4,
                          })}
                        </span>
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-400 group-hover:bg-accent/10 group-hover:text-accent">
                          <Sparkles size={8} />
                        </div>
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      onGenerateIngredients?.(
                        name,
                        note,
                        manualCount ? parseInt(manualCount) : undefined
                      )
                    }
                    disabled={isGenerating || !name.trim()}
                    className="h-11 w-full gap-2 rounded-xl border-none bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t("Ingredients.generating")}
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        {t("Ingredients.generateButton")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
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
