"use client";

import { Loader2, Sparkles, Lock } from "lucide-react";
import { IngredientList } from "@/components/planning/ingredient-list";
import { type Ingredient } from "@/lib/types";

interface ItemIngredientsProps {
  ingredients?: Ingredient[];
  itemName: string;
  itemNote?: string;
  readOnly?: boolean;
  isGenerating?: boolean;
  isAuthenticated?: boolean;
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
  onGenerateIngredients,
  onToggleIngredient,
  onDeleteIngredient,
  onCreateIngredient,
  onDeleteAllIngredients,
  onRequestAuth,
}: ItemIngredientsProps) {
  if (!onGenerateIngredients) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      {/* Generate button - only show if NO ingredients yet */}
      {!readOnly && (!ingredients || ingredients.length === 0) && (
        <>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onGenerateIngredients(itemName, itemNote)}
              disabled={isGenerating || !itemName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-accent px-4 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generation en cours...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generer les ingredients
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestAuth}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-600 transition-all hover:border-purple-300 hover:bg-purple-100"
            >
              <Lock size={16} />
              Connectez-vous pour générer les ingrédients
            </button>
          )}
        </>
      )}

      {/* Loading state with message */}
      {isGenerating && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin text-purple-500" />
          <span>L&apos;IA analyse votre plat...</span>
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
