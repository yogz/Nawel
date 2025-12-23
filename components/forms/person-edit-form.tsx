"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Person } from "@/lib/types";
import { PERSON_EMOJIS, getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clsx from "clsx";

export function PersonEditForm({
    person,
    allPeople,
    onSubmit,
    onDelete,
    readOnly,
}: {
    person: Person;
    allPeople: Person[];
    onSubmit: (name: string, emoji: string | null) => void;
    onDelete: () => void;
    readOnly?: boolean;
}) {
    const [name, setName] = useState(person.name);
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(person.emoji);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-person-name">Nom</Label>
                    <Input
                        id="edit-person-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={readOnly}
                    />
                </div>

                <div className="space-y-3">
                    <Label>Emoji Signature</Label>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 no-scrollbar">
                        <button
                            onClick={() => setSelectedEmoji(null)}
                            className={clsx(
                                "flex aspect-square items-center justify-center rounded-xl text-lg transition-all",
                                selectedEmoji === null ? "bg-accent text-white shadow-md ring-2 ring-accent/20" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                        >
                            Auto
                        </button>
                        {PERSON_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => setSelectedEmoji(emoji)}
                                className={clsx(
                                    "flex aspect-square items-center justify-center rounded-xl text-lg transition-all",
                                    selectedEmoji === emoji ? "bg-accent text-white shadow-md ring-2 ring-accent/20" : "bg-gray-50 hover:bg-gray-100"
                                )}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                        Par défaut: {getPersonEmoji(name, allPeople.map(p => p.name))}
                    </p>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
                <Button
                    className="w-full"
                    onClick={() => onSubmit(name, selectedEmoji)}
                    disabled={readOnly || !name.trim()}
                >
                    Enregistrer les modifications
                </Button>
                <Button
                    variant="destructive"
                    className="w-full"
                    onClick={onDelete}
                    disabled={readOnly}
                >
                    <Trash2 size={16} className="mr-2" />
                    Supprimer ce convive
                </Button>
            </div>
        </div>
    );
}
