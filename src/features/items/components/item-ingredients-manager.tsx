"use client";

import { useState, useRef, useEffect } from "react";
import { type Ingredient } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import clsx from "clsx";

interface ItemIngredientsManagerProps {
  itemId: number;
  itemName: string;
  ingredients: Ingredient[];
  onToggleIngredient: (id: number, checked: boolean) => void;
  onDeleteIngredient: (id: number) => void;
  onCreateIngredient: (name: string, quantity?: string) => void;
  onDeleteAll: () => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function ItemIngredientsManager({
  itemId,
  itemName,
  ingredients,
  onToggleIngredient,
  onDeleteIngredient,
  onCreateIngredient,
  onDeleteAll,
  onClose,
  readOnly,
}: ItemIngredientsManagerProps) {
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const tShared = useTranslations("EventDashboard.Shared");

  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateIngredient(newName.trim(), newQuantity.trim() || undefined);
      setNewName("");
      setNewQuantity("");
      // Keep focus for rapid entry
      inputRef.current?.focus();

      // Scroll to bottom to see new item
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white duration-300 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 pt-10 sm:pt-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{itemName}</h2>
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            {ingredients.length} {tShared("items")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ingredients.length > 0 && !readOnly && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                  aria-label={tShared("deleteAll")}
                >
                  <Trash2 size={22} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tShared("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAll}
                    className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                  >
                    {tShared("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* List Area */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {ingredients.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-6 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
              <Plus className="text-gray-300" size={40} />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-bold text-gray-900">{t("addManual")}</p>
              <p className="text-sm text-gray-500">{t("addDescription")}</p>
            </div>
          </div>
        ) : (
          ingredients.map((ing) => (
            <div
              key={ing.id}
              className={clsx(
                "flex items-center gap-3 rounded-2xl border p-4 transition-all active:scale-[0.98]",
                ing.checked
                  ? "border-green-100 bg-green-50 ring-1 ring-green-100"
                  : "border-gray-100 bg-gray-50"
              )}
              onClick={() => !readOnly && onToggleIngredient(ing.id, !ing.checked)}
            >
              <div
                className={clsx("flex-shrink-0", ing.checked ? "text-green-500" : "text-gray-300")}
              >
                {ing.checked ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    "truncate text-base font-semibold",
                    ing.checked ? "text-green-700 line-through opacity-60" : "text-gray-900"
                  )}
                >
                  {ing.name}
                  {ing.quantity && (
                    <span className="text-sm font-normal opacity-70"> ({ing.quantity})</span>
                  )}
                </p>
              </div>

              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteIngredient(ing.id);
                  }}
                  className="p-2 text-gray-300 transition-colors hover:text-red-500"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ))
        )}

        {/* Padding for the sticky elements */}
        <div className="h-40" />
      </div>

      {/* Sticky Input Footer */}
      {!readOnly && (
        <div className="absolute bottom-0 left-0 right-0 border-t bg-white/80 p-4 pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  placeholder={t("namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="h-14 rounded-2xl border-none bg-gray-100 px-5 text-base focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>
              <div className="w-24">
                <Input
                  placeholder={t("quantityShort")}
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="h-14 rounded-2xl border-none bg-gray-100 px-4 text-center text-base focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="h-14 w-14 shrink-0 rounded-2xl bg-accent p-0 shadow-lg shadow-accent/20 hover:bg-accent/90"
              >
                <Plus size={24} className="text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
