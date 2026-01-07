"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { IngredientForm } from "@/features/items/components/ingredient-form";
import { Plus, X } from "lucide-react";
import { type Ingredient } from "@/lib/types";
import clsx from "clsx";
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
  const t = useTranslations("EventDashboard.ItemForm.Ingredients");
  const tShared = useTranslations("EventDashboard.Shared");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const _handleAdd = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newQuantity.trim() || undefined);
      setNewName("");
      setNewQuantity("");
      setShowAddForm(false);
    }
  };

  if (ingredients.length === 0) {
    return null;
  }

  const checkedCount = ingredients.filter((i) => i.checked).length;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Ingredients ({checkedCount}/{ingredients.length})
        </span>
        {!readOnly && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="text-xs text-red-400 hover:text-red-600">
                {tShared("deleteAll") || "Tout supprimer"}
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
              {ing.quantity && <span className="opacity-70"> ({ing.quantity})</span>}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onDelete(ing.id)}
                className="text-gray-300 transition-colors hover:text-red-500"
                aria-label={tShared("delete") || "Supprimer"}
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
            <IngredientForm
              onSubmit={(name, qty) => {
                onCreate(name, qty);
                setShowAddForm(false);
                setNewName("");
                setNewQuantity("");
              }}
              onCancel={() => {
                setShowAddForm(false);
                setNewName("");
                setNewQuantity("");
              }}
              className="mt-3"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus size={12} />
              {t("addManual")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
