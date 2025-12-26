"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PersonForm({
  onSubmit,
  readOnly,
  currentUserId,
}: {
  onSubmit: (name: string, emoji?: string, userId?: string) => void;
  readOnly?: boolean;
  currentUserId?: string;
}) {
  const [name, setName] = useState("");
  const [isMe, setIsMe] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, undefined, isMe ? currentUserId : undefined);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="person-name">Nom du convive</Label>
        <Input
          id="person-name"
          placeholder="Ex: Jean-Michel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          disabled={readOnly}
          autoFocus
        />
      </div>

      {currentUserId && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-me"
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
            checked={isMe}
            onChange={(e) => setIsMe(e.target.checked)}
          />
          <Label htmlFor="is-me" className="text-sm font-medium text-gray-700">
            C'est moi ! 👋
          </Label>
        </div>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={readOnly || !name.trim()}>
        Ajouter au groupe ✨
      </Button>
    </div>
  );
}
