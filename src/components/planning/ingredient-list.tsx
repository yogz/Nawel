"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { Ingredient } from "@/lib/types";
import clsx from "clsx";

interface IngredientListProps {
  ingredients: Ingredient[];
  onToggle: (id: number, checked: boolean) => void;
  onDelete: (id: number) => void;
  onCreate: (name: string, quantity?: string) => void;
  onDeleteAll: () => void;
  readOnly?: boolean;
}

export function IngredientList({
  ingredients,
  onToggle,
  onDelete,
  onCreate,
  onDeleteAll,
  readOnly,
}: IngredientListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newQuantity.trim() || undefined);
      setNewName("");
      setNewQuantity("");
      setShowAddForm(false);
    }
  };

  if (ingredients.length === 0) return null;

  const checkedCount = ingredients.filter((i) => i.checked).length;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Ingredients ({checkedCount}/{ingredients.length})
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onDeleteAll}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Tout supprimer
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {ingredients.map((ing) => (
          <div
            key={ing.id}
            className={clsx(
              "flex items-center gap-2 rounded-lg p-2 transition-all",
              ing.checked ? "bg-green-50" : "bg-gray-50"
            )}
          >
            <Checkbox
              checked={ing.checked}
              onCheckedChange={(checked) => onToggle(ing.id, !!checked)}
              disabled={readOnly}
            />
            <span className={clsx("flex-1 text-sm", ing.checked && "text-gray-400 line-through")}>
              {ing.name}
            </span>
            {ing.quantity && (
              <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-500">
                {ing.quantity}
              </span>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onDelete(ing.id)}
                className="text-gray-300 transition-colors hover:text-red-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          {showAddForm ? (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Ingredient"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 flex-1 rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
              <Input
                placeholder="Qte"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="h-9 w-20 rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg bg-accent px-3 py-1 text-sm font-semibold text-white"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus size={12} />
              Ajouter un ingredient
            </button>
          )}
        </>
      )}
    </div>
  );
}
