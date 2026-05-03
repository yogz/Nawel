"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createTicketAction } from "@/features/sortie/actions/ticket-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { TicketRecipientCandidate } from "@/features/sortie/queries/ticket-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  shortId: string;
  candidates: TicketRecipientCandidate[];
};

type Scope = "participant" | "outing";

export function TicketsOrganizerPanel({ shortId, candidates }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    createTicketAction,
    {} as FormActionState
  );
  const [scope, setScope] = useState<Scope>("participant");
  const [participantId, setParticipantId] = useState<string>(candidates[0]?.participantId ?? "");

  const errors = state.errors ?? {};

  // Un participant sans compte ET sans email ne pourra jamais réclamer son
  // billet — on le grise dans le sélecteur pour éviter à l'organisateur de
  // perdre du temps. La règle est aussi enforcée côté action.
  const selectableCandidates = candidates.filter((c) => c.hasAccount || c.hasEmail);
  const unreachableCount = candidates.length - selectableCandidates.length;

  const noCandidates = selectableCandidates.length === 0;
  const submitDisabled = pending || (scope === "participant" && (noCandidates || !participantId));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-md border border-surface-400 bg-surface-50 p-4"
    >
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="scope" value={scope} />
      {scope === "participant" && (
        <input type="hidden" name="participantId" value={participantId} />
      )}

      <header>
        <Eyebrow tone="hot" glow className="mb-2">
          ─ ajouter un billet ─
        </Eyebrow>
        <p className="text-sm text-ink-500">
          PDF, JPEG, PNG ou WebP — 5 Mo max. Le fichier est chiffré côté serveur.
        </p>
      </header>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium text-ink-500">Type de billet</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ScopeOption
            value="participant"
            checked={scope === "participant"}
            onChange={() => setScope("participant")}
            title="Nominatif"
            hint="Un fichier pour un participant donné."
          />
          <ScopeOption
            value="outing"
            checked={scope === "outing"}
            onChange={() => setScope("outing")}
            title="Groupé"
            hint="Un fichier partagé avec toute la sortie."
          />
        </div>
      </fieldset>

      {scope === "participant" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-participant" className="text-[13px] font-medium text-ink-500">
            Destinataire
          </Label>
          {noCandidates ? (
            <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
              Aucun participant n&rsquo;a de compte ou d&rsquo;email pour récupérer un billet.
            </p>
          ) : (
            <select
              id="ticket-participant"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="h-11 rounded-md border border-surface-400 bg-surface-50 px-3 text-sm text-ink-700"
            >
              {selectableCandidates.map((c) => (
                <option key={c.participantId} value={c.participantId}>
                  {c.displayName}
                  {!c.hasAccount && c.hasEmail ? " — pas encore connecté" : ""}
                </option>
              ))}
            </select>
          )}
          {unreachableCount > 0 && (
            <p className="text-xs text-ink-400">
              {unreachableCount} participant{unreachableCount > 1 ? "s" : ""} sans compte ni email —
              demande-leur d&rsquo;ajouter un email à leur réponse pour les rendre éligibles.
            </p>
          )}
          {errors.participantId?.[0] && (
            <p className="text-xs text-erreur-700">{errors.participantId[0]}</p>
          )}
        </div>
      )}

      {scope === "outing" && (
        <p className="rounded-md border border-acid-600/30 bg-acid-600/5 px-3 py-2 text-xs text-ink-500">
          Tous les participants qui ont répondu <strong>oui</strong> ou{" "}
          <strong>j&rsquo;y vais en perso</strong> verront ce billet. Les autres réponses (non,
          intéressé) n&rsquo;y auront pas accès.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ticket-file" className="text-[13px] font-medium text-ink-500">
          Fichier du billet
        </Label>
        <input
          id="ticket-file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          className="text-sm text-ink-600 file:mr-3 file:rounded-md file:border file:border-surface-400 file:bg-surface-50 file:px-3 file:py-2 file:text-sm file:text-ink-600 hover:file:border-hot-500"
        />
      </div>

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={submitDisabled}>
          {pending ? "Envoi…" : "Uploader"}
        </Button>
      </div>
    </form>
  );
}

function ScopeOption({
  value,
  checked,
  onChange,
  title,
  hint,
}: {
  value: Scope;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        checked
          ? "border-hot-500 bg-hot-50"
          : "border-surface-400 bg-surface-50 hover:border-hot-500/50"
      }`}
    >
      <input
        type="radio"
        name="scope-picker"
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-acid-600"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink-700">{title}</span>
        <span className="text-xs text-ink-400">{hint}</span>
      </span>
    </label>
  );
}
