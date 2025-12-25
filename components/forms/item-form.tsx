"use client";

import { useState, useRef, useEffect } from "react";
import { Item, Person, Meal, Ingredient } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { IngredientList } from "@/components/planning/ingredient-list";
import clsx from "clsx";

export function ItemForm({
    people,
    defaultItem,
    allMeals,
    currentMealId,
    mealPeopleCount,
    onSubmit,
    onAssign,
    onMoveMeal,
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
}: {
    people: Person[];
    defaultItem?: Item;
    allMeals?: Array<Meal & { dayTitle: string }>;
    currentMealId?: number;
    mealPeopleCount?: number;
    onSubmit: (values: { name: string; quantity?: string; note?: string; price?: number }) => void;
    onAssign: (personId: number | null) => void;
    onMoveMeal?: (targetMealId: number) => void;
    onDelete?: () => void;
    readOnly?: boolean;
    // Ingredient props
    ingredients?: Ingredient[];
    onGenerateIngredients?: () => Promise<void>;
    onToggleIngredient?: (id: number, checked: boolean) => void;
    onDeleteIngredient?: (id: number) => void;
    onCreateIngredient?: (name: string, quantity?: string) => void;
    onDeleteAllIngredients?: () => void;
    isGenerating?: boolean;
}) {
    const defaultNote = !defaultItem && mealPeopleCount ? `Pour ${mealPeopleCount} personne${mealPeopleCount > 1 ? "s" : ""}` : "";
    const [name, setName] = useState(defaultItem?.name || "");
    const [quantity, setQuantity] = useState(defaultItem?.quantity || "");
    const [note, setNote] = useState(defaultItem?.note || defaultNote);
    const [price, setPrice] = useState(defaultItem?.price?.toString() || "");
    const [showDetails, setShowDetails] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isEditMode = !!defaultItem;

    // Auto-save logic for existing items
    useEffect(() => {
        if (!defaultItem || readOnly) return;

        const hasChanged =
            name !== defaultItem.name ||
            quantity !== (defaultItem.quantity || "") ||
            note !== (defaultItem.note || "") ||
            price !== (defaultItem.price?.toString() || "");

        if (hasChanged) {
            if (timerRef.current) clearTimeout(timerRef.current);
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
            if (timerRef.current) clearTimeout(timerRef.current);
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
                <Label htmlFor="item-name">Article</Label>
                <Input
                    id="item-name"
                    placeholder="Ex: Fromage, Vin rouge, Bûche..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={readOnly}
                    autoFocus={!defaultItem}
                    className="h-12 rounded-2xl text-base"
                />
            </div>

            {/* Quick details row */}
            <div className="flex gap-2">
                <Input
                    placeholder="Qté (ex: 2kg)"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={readOnly}
                    className="flex-1 h-11 rounded-xl text-sm"
                />
                <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Prix €"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={readOnly}
                    className="w-24 h-11 rounded-xl text-sm"
                />
            </div>

            {/* Assign to person - compact horizontal scroll on mobile */}
            <div className="space-y-2">
                <Label className="text-xs text-gray-400">Qui s&apos;en occupe ?</Label>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button
                        onClick={() => onAssign(null)}
                        className={clsx(
                            "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all shrink-0",
                            !defaultItem?.personId
                                ? "bg-amber-100 text-amber-900 ring-2 ring-amber-200"
                                : "bg-gray-50 text-gray-500"
                        )}
                    >
                        <span className="text-lg">🥘</span>
                        <span className="text-[9px] font-bold whitespace-nowrap">À prévoir</span>
                    </button>
                    {people.map((person) => (
                        <button
                            key={person.id}
                            onClick={() => onAssign(person.id)}
                            className={clsx(
                                "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all shrink-0 min-w-[60px]",
                                defaultItem?.personId === person.id
                                    ? "bg-accent text-white ring-2 ring-accent/20"
                                    : "bg-gray-50 text-gray-600"
                            )}
                        >
                            <span className="text-lg">{getPersonEmoji(person.name, people.map(p => p.name), person.emoji)}</span>
                            <span className="text-[9px] font-bold truncate max-w-[50px]">{person.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Expandable details */}
            <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
                <ChevronDown className={clsx("w-4 h-4 transition-transform", showDetails && "rotate-180")} />
                {showDetails ? "Moins d'options" : "Plus d'options"}
            </button>

            {showDetails && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                    {/* Note */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Note</Label>
                        <Input
                            placeholder="Marque, allergies, détails..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={readOnly}
                            className="h-10 rounded-xl text-sm"
                        />
                    </div>

                    {/* Move to another meal */}
                    {isEditMode && allMeals && allMeals.length > 1 && (
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Déplacer</Label>
                            <Select
                                value={currentMealId?.toString()}
                                onValueChange={(val) => onMoveMeal?.(Number(val))}
                                disabled={readOnly}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Autre service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allMeals.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.dayTitle} • {m.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Delete button */}
                    {isEditMode && onDelete && (
                        <Button
                            variant="ghost"
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10"
                            onClick={onDelete}
                            disabled={readOnly}
                        >
                            <Trash2 size={14} className="mr-1.5" />
                            Supprimer
                        </Button>
                    )}
                </div>
            )}

            {/* AI Ingredients section - only for existing items */}
            {isEditMode && onGenerateIngredients && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                    {/* Generate button - only show if NO ingredients yet */}
                    {!readOnly && (!ingredients || ingredients.length === 0) && (
                        <button
                            type="button"
                            onClick={onGenerateIngredients}
                            disabled={isGenerating || !name.trim()}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-accent px-4 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
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
                    )}

                    {/* Loading state with message */}
                    {isGenerating && (
                        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                            <Loader2 size={18} className="animate-spin text-purple-500" />
                            <span>L&apos;IA analyse votre plat...</span>
                        </div>
                    )}

                    {/* Ingredient list */}
                    {ingredients && ingredients.length > 0 && onToggleIngredient && onDeleteIngredient && onCreateIngredient && onDeleteAllIngredients && (
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
            )}

            {/* Add button for new items */}
            {!isEditMode && (
                <Button
                    className="w-full h-12 rounded-2xl text-base"
                    onClick={handleSubmit}
                    disabled={readOnly || !name.trim()}
                >
                    Ajouter
                </Button>
            )}
        </div>
    );
}
