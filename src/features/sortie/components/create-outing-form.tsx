"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";

const INITIAL: FormActionState = {};

type Props = {
  defaultCreatorName?: string;
  isLoggedIn: boolean;
};

export function CreateOutingForm({ defaultCreatorName, isLoggedIn }: Props) {
  const [state, formAction, pending] = useActionState(createOutingAction, INITIAL);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field
        label="Titre de la sortie"
        name="title"
        required
        maxLength={200}
        placeholder="Macbeth à la Comédie-Française"
        error={errors.title?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date et heure"
          name="startsAt"
          type="datetime-local"
          required
          error={errors.startsAt?.[0]}
        />
        <Field
          label="Réponse avant"
          name="rsvpDeadline"
          type="datetime-local"
          required
          helper="La liste se fige après cette date."
          error={errors.rsvpDeadline?.[0]}
        />
      </div>

      <Field
        label="Lieu"
        name="venue"
        maxLength={200}
        placeholder="Salle Richelieu · Paris 1er"
        helper="Facultatif."
        error={errors.venue?.[0]}
      />

      <Field
        label="Lien billetterie"
        name="ticketUrl"
        type="url"
        placeholder="https://…"
        helper="Facultatif."
        error={errors.ticketUrl?.[0]}
      />

      {!isLoggedIn && (
        <>
          <Field
            label="Ton prénom"
            name="creatorDisplayName"
            required
            defaultValue={defaultCreatorName}
            maxLength={100}
            error={errors.creatorDisplayName?.[0]}
          />
          <Field
            label="Ton email"
            name="creatorEmail"
            type="email"
            helper="Facultatif — pour reprendre la main si tu changes d'appareil."
            error={errors.creatorEmail?.[0]}
          />
        </>
      )}

      {isLoggedIn && (
        <label className="flex items-start gap-3 text-sm text-encre-500">
          <input
            type="checkbox"
            name="showOnProfile"
            defaultChecked
            className="mt-1 h-4 w-4 accent-bordeaux-600"
          />
          <span>Afficher cette sortie sur mon profil.</span>
        </label>
      )}

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Publication…" : "Publier ma sortie"}
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
  placeholder,
  defaultValue,
  helper,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string;
  helper?: string;
  error?: string;
}) {
  const isTextarea = type === "textarea";
  const describedBy = `${name}-help`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium text-encre-500">
        {label}
        {!required && <span className="ml-1 text-encre-300">(facultatif)</span>}
      </Label>
      {isTextarea ? (
        <Textarea
          id={name}
          name={name}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-describedby={helper || error ? describedBy : undefined}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-describedby={helper || error ? describedBy : undefined}
        />
      )}
      {(helper || error) && (
        <p
          id={describedBy}
          className={error ? "text-xs text-erreur-700" : "text-xs text-encre-400"}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
