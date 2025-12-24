"use client";

import { useState, useRef, useEffect } from "react";
import { Item, Person, Meal } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Euro, Scale, MessageSquare, ArrowRightLeft } from "lucide-react";
import clsx from "clsx";

export function ItemForm({
    people,
    defaultItem,
    allMeals,
    currentMealId,
    onSubmit,
    onAssign,
    onMoveMeal,
    onDelete,
    readOnly,
}: {
    people: Person[];
    defaultItem?: Item;
    allMeals?: Array<Meal & { dayTitle: string }>;
    currentMealId?: number;
    onSubmit: (values: { name: string; quantity?: string; note?: string; price?: number }) => void;
    onAssign: (personId: number | null) => void;
    onMoveMeal?: (targetMealId: number) => void;
    onDelete?: () => void;
    readOnly?: boolean;
}) {
    const [name, setName] = useState(defaultItem?.name || "");
    const [quantity, setQuantity] = useState(defaultItem?.quantity || "");
    const [note, setNote] = useState(defaultItem?.note || "");
    const [price, setPrice] = useState(defaultItem?.price?.toString() || "");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="item-name">Nom de l&apos;article</Label>
                    <Input
                        id="item-name"
                        placeholder="Ex: Fromage, Vin rouge, Bûche..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={readOnly}
                        autoFocus={!defaultItem}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="item-quantity" className="flex items-center gap-1.5">
                            <Scale size={14} className="text-gray-400" /> Quantité
                        </Label>
                        <Input
                            id="item-quantity"
                            placeholder="Ex: 2kg, 3 bouteilles"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="item-price" className="flex items-center gap-1.5">
                            <Euro size={14} className="text-gray-400" /> Prix approx.
                        </Label>
                        <Input
                            id="item-price"
                            type="number"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="item-note" className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-gray-400" /> Note ou préférence
                    </Label>
                    <Textarea
                        id="item-note"
                        placeholder="Marque, allergies, détails..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={readOnly}
                        rows={2}
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Assigner à quelqu&apos;un</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => onAssign(null)}
                            className={clsx(
                                "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all",
                                !defaultItem?.personId ? "bg-amber-100 text-amber-900 shadow-sm ring-2 ring-amber-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                        >
                            <span className="text-xl">🥘</span>
                            <span className="text-[10px] font-bold uppercase tracking-tight">À prévoir</span>
                        </button>
                        {people.map((person) => (
                            <button
                                key={person.id}
                                onClick={() => onAssign(person.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all",
                                    defaultItem?.personId === person.id ? "bg-accent text-white shadow-md ring-2 ring-accent/20" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <span className="text-xl">{getPersonEmoji(person.name, people.map(p => p.name), person.emoji)}</span>
                                <span className="w-full truncate text-[10px] font-bold uppercase tracking-tight text-center">{person.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {defaultItem && allMeals && allMeals.length > 1 && (
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            <ArrowRightLeft size={12} /> Déplacer vers un autre service
                        </Label>
                        <Select
                            value={currentMealId?.toString()}
                            onValueChange={(val) => onMoveMeal?.(Number(val))}
                            disabled={readOnly}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Changer de service" />
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
            </div>

            {!defaultItem && (
                <Button className="w-full" onClick={handleSubmit} disabled={readOnly || !name.trim()}>
                    Ajouter cet article 🎁
                </Button>
            )}

            {defaultItem && onDelete && (
                <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl"
                    onClick={onDelete}
                    disabled={readOnly}
                >
                    <Trash2 size={16} className="mr-2" />
                    Supprimer cet article
                </Button>
            )}
        </div>
    );
}
