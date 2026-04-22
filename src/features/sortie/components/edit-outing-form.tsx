"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { toDateTimeLocalValue } from "@/features/sortie/lib/date-fr";

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

      <Field
        label="Titre"
        name="title"
        required
        maxLength={200}
        defaultValue={title}
        error={errors.title?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date et heure"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={startsAt ? toDateTimeLocalValue(startsAt) : ""}
          error={errors.startsAt?.[0]}
        />
        <Field
          label="Réponse avant"
          name="rsvpDeadline"
          type="datetime-local"
          required
          defaultValue={toDateTimeLocalValue(deadlineAt)}
          error={errors.rsvpDeadline?.[0]}
        />
      </div>

      <Field
        label="Lieu"
        name="venue"
        maxLength={200}
        defaultValue={venue ?? ""}
        error={errors.venue?.[0]}
      />

      <Field
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

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium text-encre-500">
        {label}
        {!required && <span className="ml-1 text-encre-300">(facultatif)</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
      {error && <p className="text-xs text-erreur-700">{error}</p>}
    </div>
  );
}
