"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PersonForm({
  onSubmit,
  readOnly,
}: {
  onSubmit: (name: string) => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState("");

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
            if (e.key === "Enter" && name.trim()) {
              onSubmit(name);
            }
          }}
          disabled={readOnly}
          autoFocus
        />
      </div>
      <Button
        variant="premium"
        className="w-full py-6 pr-8 shadow-md"
        icon={<span>✨</span>}
        onClick={() => onSubmit(name)}
        disabled={readOnly || !name.trim()}
        shine
      >
        <span className="text-sm font-black uppercase tracking-widest text-gray-700">
          Ajouter au groupe
        </span>
      </Button>
    </div>
  );
}
