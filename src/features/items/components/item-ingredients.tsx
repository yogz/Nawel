"use client";

import { useState } from "react";
import { Loader2, Sparkles, Lock, Plus } from "lucide-react";
import { IngredientList } from "@/components/planning/ingredient-list";
import { IngredientForm } from "./ingredient-form";
import { type Ingredient } from "@/lib/types";
import { useTranslations } from "next-intl";

interface ItemIngredientsProps {
  ingredients?: Ingredient[];
  itemName: string;
  itemNote?: string;
  readOnly?: boolean;
  isGenerating?: boolean;
  isAuthenticated?: boolean;
  isEmailVerified?: boolean;
  onGenerateIngredients?: (name: string, note?: string) => Promise<void>;
  onToggleIngredient?: (id: number, checked: boolean) => void;
  onDeleteIngredient?: (id: number) => void;
  onCreateIngredient?: (name: string, quantity?: string) => void;
  onDeleteAllIngredients?: () => void;
  onRequestAuth?: () => void;
}

export function ItemIngredients({
  ingredients,
  itemName,
  itemNote,
  readOnly,
  isGenerating,
  isAuthenticated,
  isEmailVerified,
  onGenerateIngredients,
  onToggleIngredient,
  onDeleteIngredient,
  onCreateIngredient,
  onDeleteAllIngredients,
  onRequestAuth,
}: ItemIngredientsProps) {
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const tActions = useTranslations("Translations.actions");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  if (!onGenerateIngredients) {
    return null;
  }

  const handleManualAdd = () => {
    if (newName.trim() && onCreateIngredient) {
      onCreateIngredient(newName.trim(), newQuantity.trim() || undefined);
      setNewName("");
      setNewQuantity("");
      setShowManualAdd(false);
    }
  };

  const hasNoIngredients = !ingredients || ingredients.length === 0;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      {/* Buttons when NO ingredients yet */}
      {!readOnly && hasNoIngredients && !showManualAdd && (
        <div className="space-y-2">
          {/* AI Generate button */}
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onRequestAuth}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-600 transition-all hover:border-purple-300 hover:bg-purple-100"
            >
              <Lock size={16} />
              {t("authRequired")}
            </button>
          ) : !isEmailVerified ? (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 whitespace-normal rounded-xl border-2 border-dashed border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600"
            >
              <Lock size={16} className="shrink-0" />
              <span>{tActions("emailNotVerifiedAI")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onGenerateIngredients(itemName, itemNote)}
              disabled={isGenerating || !itemName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {t("generateButton")}
                </>
              )}
            </button>
          )}

          {/* Manual add button */}
          <button
            type="button"
            onClick={() => setShowManualAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <Plus size={16} />
            {t("addManual")}
          </button>
        </div>
      )}

      {/* Manual add form when no ingredients */}
      {!readOnly && hasNoIngredients && showManualAdd && (
        <IngredientForm
          onSubmit={handleManualAdd}
          onCancel={() => {
            setShowManualAdd(false);
            setNewName("");
            setNewQuantity("");
          }}
        />
      )}

      {/* Loading state with skeleton */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-2 text-sm text-purple-600">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-medium">{t("analyzing")}</span>
          </div>
          {/* Skeleton ingredients - varying widths for natural look */}
          {[75, 60, 85, 50, 70].map((width, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
            >
              <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-3.5 animate-pulse rounded bg-gray-200"
                  style={{ width: `${width}%` }}
                />
                <div
                  className="h-2.5 animate-pulse rounded bg-gray-100"
                  style={{ width: `${width * 0.5}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingredient list */}
      {ingredients &&
        ingredients.length > 0 &&
        onToggleIngredient &&
        onDeleteIngredient &&
        onCreateIngredient &&
        onDeleteAllIngredients && (
          <IngredientList
            ingredients={ingredients}
            onToggle={onToggleIngredient}
            onDelete={onDeleteIngredient}
            onCreate={onCreateIngredient}
            onDeleteAll={onDeleteAllIngredients}
            readOnly={readOnly}
          />
        )}
    </div>
  );
}
