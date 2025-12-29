"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Check } from "lucide-react";
import Image from "next/image";
import { type Person } from "@/lib/types";
import { PERSON_EMOJIS, getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clsx from "clsx";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("EventDashboard.PersonForm");
  const tCommon = useTranslations("EventDashboard.Shared");
  const [name, setName] = useState(person.name);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(person.emoji);
  const skipSaveRef = useRef(false);
  const stateRef = useRef({ name, selectedEmoji });

  useEffect(() => {
    stateRef.current = { name, selectedEmoji };
  }, [name, selectedEmoji]);

  useEffect(() => {
    return () => {
      if (!skipSaveRef.current && !readOnly) {
        const { name: currName, selectedEmoji: currEmoji } = stateRef.current;
        const hasChanged = currName !== person.name || currEmoji !== person.emoji;

        if (hasChanged && currName.trim()) {
          onSubmit(currName, currEmoji);
        }
      }
    };
  }, [person, readOnly, onSubmit]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {person.user?.image && (
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-accent/20 bg-accent/5 shadow-sm">
              <Image
                src={person.user.image}
                alt={person.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">
              {t("googlePhotoNotice")}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label
            htmlFor="edit-person-name"
            className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {t("nameLabel")}
          </Label>
          <Input
            id="edit-person-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
          />
        </div>

        <div className="space-y-3">
          <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t("emojiLabel")}
          </Label>
          <div className="no-scrollbar grid max-h-48 grid-cols-6 gap-2 overflow-y-auto p-1">
            <button
              onClick={() => setSelectedEmoji(null)}
              className={clsx(
                "flex aspect-square items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedEmoji === null
                  ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              )}
            >
              {t("autoEmoji")}
            </button>
            {PERSON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={clsx(
                  "flex aspect-square items-center justify-center rounded-xl text-lg transition-all",
                  selectedEmoji === emoji
                    ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] italic text-gray-400">
            {t("defaultEmoji")}{" "}
            {getPersonEmoji(
              name,
              allPeople.map((p) => p.name)
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-6">
        <Button
          variant="premium"
          className="w-full border-red-100 bg-red-50/30"
          icon={<Trash2 size={16} />}
          iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
          onClick={() => {
            skipSaveRef.current = true;
            onDelete();
          }}
          disabled={readOnly}
        >
          <span className="text-xs font-black uppercase tracking-widest text-red-600">
            {t("deleteButton")}
          </span>
        </Button>
      </div>
    </div>
  );
}
