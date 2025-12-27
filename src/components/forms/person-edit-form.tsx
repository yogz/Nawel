"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { type Person } from "@/lib/types";
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
    <div className="space-y-6">
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
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Emoji Signature
          </Label>
          <div className="no-scrollbar grid max-h-48 grid-cols-6 gap-3 overflow-y-auto p-1">
            <button
              onClick={() => setSelectedEmoji(null)}
              className={clsx(
                "flex aspect-square items-center justify-center rounded-full text-xs font-black uppercase transition-all active:scale-95",
                selectedEmoji === null
                  ? "bg-accent text-white shadow-lg shadow-accent/20 ring-2 ring-accent/20"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              )}
            >
              Auto
            </button>
            {PERSON_EMOJIS.map((emoji) => {
              const isSelected = selectedEmoji === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={clsx(
                    "flex aspect-square items-center justify-center rounded-full text-xl transition-all active:scale-95",
                    isSelected
                      ? "bg-accent/10 shadow-inner ring-2 ring-accent/30"
                      : "bg-gray-50 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
                  )}
                >
                  <span className={clsx(isSelected ? "scale-110" : "opacity-80")}>{emoji}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] italic text-gray-400">
            Par défaut :{" "}
            {getPersonEmoji(
              name,
              allPeople.map((p) => p.name)
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <Button
          variant="premium"
          className="w-full py-6 pr-8 shadow-md"
          onClick={() => onSubmit(name, selectedEmoji)}
          disabled={readOnly || !name.trim()}
          shine
        >
          <span className="text-sm font-black uppercase tracking-widest text-gray-700">
            Enregistrer les modifications
          </span>
        </Button>
        <Button
          variant="premium"
          className="w-full border-red-100 bg-red-50/30"
          icon={<Trash2 size={16} />}
          iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
          onClick={onDelete}
          disabled={readOnly}
        >
          <span className="text-xs font-black uppercase tracking-widest text-red-600">
            Supprimer ce convive
          </span>
        </Button>
      </div>
    </div>
  );
}
