"use client";

import { useState, useRef, useEffect } from "react";
import { type Item, type Person, type Service, type Ingredient } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
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
import { Trash2, ChevronDown, Sparkles, Loader2, Plus, CircleHelp } from "lucide-react";
import clsx from "clsx";
import { ItemIngredients } from "./item-ingredients";

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
  onGenerateIngredients?: (name: string, note?: string) => Promise<void>;
  onToggleIngredient?: (id: number, checked: boolean) => void;
  onDeleteIngredient?: (id: number) => void;
  onCreateIngredient?: (name: string, quantity?: string) => void;
  onDeleteAllIngredients?: () => void;
  isGenerating?: boolean;
  // Auth props for AI features
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}) {
  const defaultNote =
    !defaultItem && servicePeopleCount
      ? `Pour ${servicePeopleCount} personne${servicePeopleCount > 1 ? "s" : ""}`
      : "";
  const [name, setName] = useState(defaultItem?.name || "");
  const [quantity, setQuantity] = useState(defaultItem?.quantity || "");
  const [note, setNote] = useState(defaultItem?.note || defaultNote);
  const [price, setPrice] = useState(defaultItem?.price?.toString() || "");
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!defaultItem;

  // Auto-save logic for existing items
  useEffect(() => {
    if (!defaultItem || readOnly) {
      return;
    }

    const hasChanged =
      name !== defaultItem.name ||
      quantity !== (defaultItem.quantity || "") ||
      note !== (defaultItem.note || "") ||
      price !== (defaultItem.price?.toString() || "");

    if (hasChanged) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onSubmit({
          name,
          quantity: quantity || undefined,
          note: note || undefined,
          price: price ? parseFloat(price) : undefined,
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [name, quantity, note, price, defaultItem, readOnly, onSubmit]);

  const handleSubmit = () => {
    onSubmit({
      name,
      quantity: quantity || undefined,
      note: note || undefined,
      price: price ? parseFloat(price) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Name - always visible */}
      <div className="space-y-2">
        <Label
          htmlFor="item-name"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          Article
        </Label>
        <Input
          id="item-name"
          placeholder="Ex: Fromage, Vin rouge, Bûche..."
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
          placeholder="Qté (ex: 2kg)"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={readOnly}
          className="h-11 flex-1 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
          aria-label="Quantité"
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Prix €"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={readOnly}
          className="h-11 w-24 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
          aria-label="Prix en euros"
        />
      </div>

      {/* Assign to person - refined cards */}
      <div className="space-y-2">
        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Qui s&apos;en occupe ?
        </Label>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => onAssign(null)}
            className={clsx(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-[20px] p-2 transition-all active:scale-95",
              !defaultItem?.personId
                ? "bg-amber-50 ring-2 ring-amber-200"
                : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
            )}
          >
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                !defaultItem?.personId ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"
              )}
            >
              <CircleHelp size={18} />
            </div>
            <span
              className={clsx(
                "whitespace-nowrap text-[9px] font-black uppercase tracking-widest",
                !defaultItem?.personId ? "text-amber-900" : "text-gray-400"
              )}
            >
              À prévoir
            </span>
          </button>
          {people.map((person) => {
            const isSelected = defaultItem?.personId === person.id;
            return (
              <button
                key={person.id}
                onClick={() => onAssign(person.id)}
                className={clsx(
                  "flex min-w-[64px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] p-2 transition-all active:scale-95",
                  isSelected
                    ? "bg-accent/5 ring-2 ring-accent/30"
                    : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
                )}
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                    isSelected ? "bg-accent text-white" : "bg-accent/10 text-accent"
                  )}
                >
                  <span className="text-lg">
                    {getPersonEmoji(
                      person.name,
                      people.map((p) => p.name),
                      person.emoji
                    )}
                  </span>
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
        {showDetails ? "Moins d'options" : "Plus d'options"}
      </button>

      {showDetails && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Note
            </Label>
            <Input
              placeholder="Marque, allergies, détails..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              className="h-11 rounded-xl border-gray-100 bg-gray-50/50 text-sm focus:bg-white"
            />
          </div>

          {isEditMode && allServices && allServices.length > 1 && (
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Déplacer
              </Label>
              <Select
                value={currentServiceId?.toString()}
                onValueChange={(val) => onMoveService?.(Number(val))}
                disabled={readOnly}
              >
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white">
                  <SelectValue placeholder="Autre service" />
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
                onClick={onDelete}
                disabled={readOnly}
              >
                <span className="text-xs font-black uppercase tracking-widest text-red-600">
                  Supprimer
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
          readOnly={readOnly}
          isGenerating={isGenerating}
          isAuthenticated={isAuthenticated}
          onGenerateIngredients={onGenerateIngredients}
          onToggleIngredient={onToggleIngredient}
          onDeleteIngredient={onDeleteIngredient}
          onCreateIngredient={onCreateIngredient}
          onDeleteAllIngredients={onDeleteAllIngredients}
          onRequestAuth={onRequestAuth}
        />
      )}

      {/* Add button for new items */}
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
              Ajouter l&apos;article
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
