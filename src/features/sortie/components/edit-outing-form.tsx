"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { toDateTimeLocalValue } from "@/features/sortie/lib/date-fr";
import { FormField } from "./form-field";

const INITIAL: FormActionState = {};

type Props = {
  shortId: string;
  title: string;
  venue: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  ticketUrl: string | null;
};

export function EditOutingForm({ shortId, title, venue, startsAt, deadlineAt, ticketUrl }: Props) {
  const [state, formAction, pending] = useActionState(updateOutingAction, INITIAL);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="shortId" value={shortId} />

      <FormField
        label="Titre"
        name="title"
        required
        maxLength={200}
        defaultValue={title}
        error={errors.title?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Date et heure"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={startsAt ? toDateTimeLocalValue(startsAt) : ""}
          error={errors.startsAt?.[0]}
        />
        <FormField
          label="Réponse avant"
          name="rsvpDeadline"
          type="datetime-local"
          required
          defaultValue={toDateTimeLocalValue(deadlineAt)}
          error={errors.rsvpDeadline?.[0]}
        />
      </div>

      <FormField
        label="Lieu"
        name="venue"
        maxLength={200}
        defaultValue={venue ?? ""}
        error={errors.venue?.[0]}
      />

      <FormField
        label="Lien billetterie"
        name="ticketUrl"
        type="url"
        defaultValue={ticketUrl ?? ""}
        error={errors.ticketUrl?.[0]}
      />

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Mise à jour…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
