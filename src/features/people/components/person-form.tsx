"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, User } from "lucide-react";
import { useTranslations } from "next-intl";

export function PersonForm({
  onSubmit,
  readOnly,
  currentUserId,
  currentUserImage,
}: {
  onSubmit: (name: string, emoji?: string, userId?: string) => void;
  readOnly?: boolean;
  currentUserId?: string;
  currentUserImage?: string | null;
}) {
  const t = useTranslations("EventDashboard.Forms.Person");
  const [name, setName] = useState("");
  const [isMe, setIsMe] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, undefined, isMe ? currentUserId : undefined);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label
          htmlFor="person-name"
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          {t("label")}
        </Label>
        <Input
          id="person-name"
          placeholder={t("placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          disabled={readOnly}
          autoFocus
          className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white focus:ring-accent/20"
        />
      </div>

      {currentUserId && (
        <div className="flex items-center space-x-3 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-100 bg-white shadow-sm ring-accent/20 focus-within:ring-2">
            <input
              type="checkbox"
              id="is-me"
              className="h-4 w-4 rounded border-none text-accent focus:ring-0 focus:ring-offset-0"
              checked={isMe}
              onChange={(e) => setIsMe(e.target.checked)}
            />
          </div>
          <Label
            htmlFor="is-me"
            className="flex cursor-pointer items-center gap-1.5 text-xs font-bold tracking-tight text-gray-600 transition-colors hover:text-accent"
          >
            {t("isMe")}{" "}
            {isMe && currentUserImage ? (
              <div className="h-5 w-5 overflow-hidden rounded-full border border-accent/20">
                <Image
                  src={currentUserImage}
                  alt="Moi"
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <User size={14} className="text-accent" />
            )}
          </Label>
        </div>
      )}

      <div className="pt-2">
        <Button
          variant="premium"
          className="w-full py-7 pr-8 shadow-md"
          icon={<UserPlus />}
          onClick={handleSubmit}
          disabled={readOnly || !name.trim()}
          shine
        >
          <span className="text-sm font-black uppercase tracking-widest text-gray-700">
            {t("addButton")}
          </span>
        </Button>
      </div>
    </div>
  );
}
