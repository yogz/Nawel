"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendReclaimMagicLinkAction } from "@/features/sortie/actions/reclaim-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  shortId: string;
};

export function ReclaimForm({ shortId }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    sendReclaimMagicLinkAction,
    {} as FormActionState
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
      >
        Pas reconnu&nbsp;? Recevoir un lien d&rsquo;accès
      </button>
    );
  }

  if (state.message && !state.errors) {
    return <p className="max-w-sm text-xs text-encre-500">{state.message}</p>;
  }

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-2 rounded-md border border-ivoire-400 bg-ivoire-50 p-3"
    >
      <input type="hidden" name="shortId" value={shortId} />
      <Label htmlFor="reclaim-email" className="text-[12px] text-encre-500">
        Email donné à la création
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="reclaim-email"
          name="email"
          type="email"
          required
          placeholder="toi@exemple.fr"
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
      {state.errors?.email?.[0] && (
        <p className="text-xs text-erreur-700">{state.errors.email[0]}</p>
      )}
    </form>
  );
}
