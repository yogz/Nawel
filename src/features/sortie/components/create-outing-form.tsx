"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { FormField } from "./form-field";

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
      <FormField
        label="Titre de la sortie"
        name="title"
        required
        maxLength={200}
        placeholder="Macbeth à la Comédie-Française"
        error={errors.title?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Date et heure"
          name="startsAt"
          type="datetime-local"
          required
          error={errors.startsAt?.[0]}
        />
        <FormField
          label="Réponse avant"
          name="rsvpDeadline"
          type="datetime-local"
          required
          helper="La liste se fige après cette date."
          error={errors.rsvpDeadline?.[0]}
        />
      </div>

      <FormField
        label="Lieu"
        name="venue"
        maxLength={200}
        placeholder="Salle Richelieu · Paris 1er"
        error={errors.venue?.[0]}
      />

      <FormField
        label="Lien billetterie"
        name="ticketUrl"
        type="url"
        placeholder="https://…"
        error={errors.ticketUrl?.[0]}
      />

      {!isLoggedIn && (
        <>
          <FormField
            label="Ton prénom"
            name="creatorDisplayName"
            required
            defaultValue={defaultCreatorName}
            maxLength={100}
            error={errors.creatorDisplayName?.[0]}
          />
          <FormField
            label="Ton email"
            name="creatorEmail"
            type="email"
            helper="Pour reprendre la main si tu changes d'appareil."
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
