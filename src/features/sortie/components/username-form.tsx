"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUsernameAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  currentUsername: string | null;
};

export function UsernameForm({ currentUsername }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateUsernameAction,
    {} as FormActionState
  );
  const [value, setValue] = useState(currentUsername ?? "");

  const justSaved = !pending && !state.errors && !state.message && value !== currentUsername;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username" className="text-[13px] font-medium text-encre-500">
          Ton nom d&rsquo;utilisateur
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-encre-400">@</span>
          <Input
            id="username"
            name="username"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().trim())}
            maxLength={30}
            placeholder="claire"
            autoComplete="off"
            spellCheck={false}
            pattern="[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]"
          />
        </div>
        <p className="text-xs text-encre-400">
          3 à 30 caractères : minuscules, chiffres, tirets. Visible à{" "}
          <span className="font-mono">sortie.colist.fr/@{value || "ton-nom"}</span>.
        </p>
        {state.errors?.username?.[0] && (
          <p className="text-xs text-erreur-700">{state.errors.username[0]}</p>
        )}
      </div>

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || value === currentUsername || value.length === 0}>
          {pending ? "Enregistrement…" : currentUsername ? "Mettre à jour" : "Réserver ce nom"}
        </Button>
        {justSaved && <span className="text-xs text-or-700">Enregistré.</span>}
      </div>
    </form>
  );
}
