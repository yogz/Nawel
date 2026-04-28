"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  // Prénom déjà connu côté serveur. Posé quand l'utilisateur a une
  // session Better Auth, OU est déjà reconnu via cookie token sur cette
  // sortie, OU a saisi son prénom sur une autre sortie depuis le même
  // device (anon prefs localStorage). Quand présent, le champ visible
  // est remplacé par un indicateur "Tu réponds en tant que …".
  defaultName?: string;
  defaultEmail?: string;
  errors?: FormActionState["errors"];
  // Texte d'aide sous le champ email (différent selon contexte : "pour
  // être prévenu·e quand la date est choisie" sur le sondage,
  // "pour être prévenu·e des changements" sur le RSVP).
  emailHint?: string;
  // Sous-titre du panneau "Tu réponds en tant que …". Le verbe varie
  // selon le contexte (vote, yes, no), donc parametré.
  knownVerb?: string;
};

/**
 * Bloc identité partagé entre les sheets RSVP et le sondage de date.
 *
 * Comportement :
 *   - Quand `defaultName` est posé, on n'affiche PAS les inputs prénom
 *     + email mais un indicateur léger ("Tu votes en tant que **Léa**")
 *     avec un lien "ce n'est pas moi" pour repasser en édition libre.
 *     Les valeurs connues sont posées en `<input type="hidden">` pour
 *     que le `formData` côté action reçoive le payload attendu.
 *   - Quand `defaultName` est absent (premier passage anonyme), on
 *     affiche les inputs comme avant.
 *   - Quand des erreurs de validation arrivent côté serveur sur
 *     `displayName` ou `email` même en mode connu, on force le passage
 *     en édition pour que l'utilisateur puisse voir + corriger.
 *
 * Le lien "ce n'est pas moi" est important : permet de prêter son
 * téléphone à un copain pour qu'il réponde sans devoir se déconnecter
 * du compte du propriétaire — scénario WhatsApp typique.
 */
export function IdentityFields({
  defaultName,
  defaultEmail,
  errors,
  emailHint = "pour être prévenu·e des changements",
  knownVerb = "réponds",
}: Props) {
  const isKnown = Boolean(defaultName);
  const hasIdentityError = Boolean(errors?.displayName || errors?.email);
  const [editing, setEditing] = useState(!isKnown);

  // Erreur de validation côté serveur sur l'identité → on force l'édit
  // pour que l'utilisateur voie le champ + le message d'erreur. Sans
  // ça, en mode "connu" l'erreur apparaîtrait dans le vide.
  const showInputs = editing || hasIdentityError || !isKnown;

  if (!showInputs && defaultName) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-surface-400 bg-surface-50 px-3 py-2.5 text-sm">
        <span className="text-ink-600">
          Tu {knownVerb} en tant que <strong className="text-ink-700">{defaultName}</strong>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs font-medium text-acid-700 underline-offset-4 hover:underline"
        >
          ce n&rsquo;est pas moi
        </button>
        <input type="hidden" name="displayName" value={defaultName} />
        {defaultEmail && <input type="hidden" name="email" value={defaultEmail} />}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName" className="text-[13px] font-medium text-ink-500">
          Ton prénom
        </Label>
        <Input
          id="displayName"
          name="displayName"
          required
          defaultValue={defaultName}
          maxLength={100}
          placeholder="Claire"
          autoComplete="given-name"
        />
        {errors?.displayName?.[0] && (
          <p className="text-xs text-erreur-700">{errors.displayName[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium text-ink-500">
          Ton email <span className="text-ink-300">(facultatif)</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          autoComplete="email"
          inputMode="email"
          placeholder={emailHint}
        />
        {errors?.email?.[0] && <p className="text-xs text-erreur-700">{errors.email[0]}</p>}
      </div>
    </>
  );
}
