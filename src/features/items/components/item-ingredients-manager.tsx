"use client";

import { useState, useRef, useEffect } from "react";
import { type Ingredient } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, CheckCircle2, Circle, Sparkles, Loader2, Lock } from "lucide-react";
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
  // AI props
  onGenerateIngredients?: (name: string, note?: string) => Promise<void>;
  isGenerating?: boolean;
  isAuthenticated?: boolean;
  isEmailVerified?: boolean;
  onRequestAuth?: () => void;
  itemNote?: string;
  readOnly?: boolean;
  onSaveFeedback?: (itemId: number, rating: number) => Promise<void>;
  justGenerated?: boolean;
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
  onGenerateIngredients,
  isGenerating,
  isAuthenticated,
  isEmailVerified,
  onRequestAuth,
  itemNote,
  readOnly,
  onSaveFeedback,
  justGenerated,
}: ItemIngredientsManagerProps) {
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const tShared = useTranslations("EventDashboard.Shared");
  const tActions = useTranslations("Translations.actions");

  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRated, setIsRated] = useState(false);
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

  const handleGenerate = async () => {
    if (onGenerateIngredients) {
      await onGenerateIngredients(itemName, itemNote);
    }
  };

  // Auto-focus on mount & Scroll on generation
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (justGenerated && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [justGenerated]);

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

            {!readOnly && onGenerateIngredients && (
              <div className="w-full max-w-xs pt-4">
                {!isAuthenticated ? (
                  <Button
                    onClick={onRequestAuth}
                    variant="outline"
                    className="h-14 w-full gap-2 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50 font-bold text-purple-600"
                  >
                    <Lock size={18} />
                    {t("authRequired")}
                  </Button>
                ) : !isEmailVerified ? (
                  <div className="flex w-full flex-col items-center gap-2">
                    <Button
                      disabled
                      variant="outline"
                      className="h-auto min-h-14 w-full gap-2 whitespace-normal rounded-2xl border-2 border-dashed border-red-200 bg-red-50 px-6 py-3 font-bold text-red-600"
                    >
                      <Lock size={18} className="shrink-0" />
                      <span>{tActions("emailNotVerifiedAI")}</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !itemName.trim()}
                    className="h-14 w-full gap-2 rounded-2xl border-none bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 font-bold text-white shadow-lg shadow-purple-200 transition-all active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {t("generating")}
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        {t("generateButton")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
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

      {/* Floating AI Feedback / Quick Actions Area */}
      <div className="pointer-events-none absolute bottom-[108px] left-0 right-0 z-10 px-4">
        {justGenerated && !isDismissed && !isRated && (
          <div className="pointer-events-auto mx-auto max-w-lg space-y-4 rounded-3xl border border-indigo-100 bg-white/95 p-5 shadow-2xl shadow-indigo-200/50 backdrop-blur-md duration-500 animate-in fade-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-none text-gray-900">{t("aiRatingTitle")}</p>
                <p className="mt-1 text-xs text-gray-500">{t("aiRatingDescription")}</p>
              </div>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-nowrap justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={async () => {
                    if (onSaveFeedback) {
                      await onSaveFeedback(itemId, n);
                      setIsRated(true);
                    }
                  }}
                  className="flex h-10 w-full items-center justify-center rounded-xl border border-gray-100 bg-white text-sm font-bold text-gray-600 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRated && (
          <div className="pointer-events-auto mx-auto max-w-xs rounded-2xl border border-green-100 bg-white/95 p-3 text-center shadow-xl backdrop-blur-md duration-300 animate-in zoom-in">
            <p className="text-sm font-bold text-green-700">{t("feedbackThanks")}</p>
          </div>
        )}
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
