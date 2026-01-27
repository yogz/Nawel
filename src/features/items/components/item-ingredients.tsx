"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { IngredientList } from "@/components/planning/ingredient-list";
import { IngredientForm } from "./ingredient-form";
import { type Ingredient } from "@/lib/types";
import { useTranslations } from "next-intl";

interface ItemIngredientsProps {
  ingredients?: Ingredient[];
  itemName: string;
  readOnly?: boolean;
  onToggleIngredient?: (id: number, checked: boolean) => void;
  onDeleteIngredient?: (id: number) => void;
  onCreateIngredient?: (name: string, quantity?: string) => void;
  onDeleteAllIngredients?: () => void;
}

export function ItemIngredients({
  ingredients,
  itemName,
  readOnly,
  onToggleIngredient,
  onDeleteIngredient,
  onCreateIngredient,
  onDeleteAllIngredients,
}: ItemIngredientsProps) {
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

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
