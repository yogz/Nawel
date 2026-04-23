"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { DateTimePicker } from "./date-time-picker";
import { FormField } from "./form-field";
import { TimeslotListEditor } from "./timeslot-list-editor";

const INITIAL: FormActionState = {};

type Props = {
  defaultCreatorName?: string;
  defaultTitle?: string;
  isLoggedIn: boolean;
};

type Mode = "fixed" | "vote";

export function CreateOutingForm({ defaultCreatorName, defaultTitle, isLoggedIn }: Props) {
  const [state, formAction, pending] = useActionState(createOutingAction, INITIAL);
  const [mode, setMode] = useState<Mode>("fixed");
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormField
        label="Titre de la sortie"
        name="title"
        required
        maxLength={200}
        defaultValue={defaultTitle}
        placeholder="Apéro à l'Ultra Brut"
        error={errors.title?.[0]}
      />

      <ModeToggle mode={mode} onChange={setMode} />
      <input type="hidden" name="mode" value={mode} />

      {mode === "fixed" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField label="Date et heure" name="startsAt" required error={errors.startsAt?.[0]} />
          <DateField
            label="Réponse avant"
            name="rsvpDeadline"
            required
            helper="La liste se fige après cette date."
            error={errors.rsvpDeadline?.[0]}
          />
        </div>
      ) : (
        <>
          <TimeslotListEditor hiddenInputName="timeslots" error={errors.timeslots?.[0]} />
          <DateField
            label="Fin du sondage"
            name="rsvpDeadline"
            required
            helper="Les votes se ferment après cette date."
            error={errors.rsvpDeadline?.[0]}
          />
        </>
      )}

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

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[13px] font-medium text-encre-500">Format</Label>
      <div className="grid grid-cols-2 gap-0 rounded-md border border-ivoire-400 bg-ivoire-50 p-0.5 text-sm">
        <ModeButton
          active={mode === "fixed"}
          onClick={() => onChange("fixed")}
          title="Date fixe"
          hint="Tu fixes la date"
        />
        <ModeButton
          active={mode === "vote"}
          onClick={() => onChange("vote")}
          title="Sondage"
          hint="Le groupe vote"
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start rounded-md px-3 py-2 text-left transition-colors ${
        active ? "bg-bordeaux-600 text-ivoire-100" : "text-encre-500 hover:bg-ivoire-100"
      }`}
    >
      <span className="text-sm font-medium">{title}</span>
      <span className={`text-xs ${active ? "text-ivoire-200" : "text-encre-400"}`}>{hint}</span>
    </button>
  );
}

function DateField({
  label,
  name,
  required,
  helper,
  error,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  helper?: string;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium text-encre-500">
        {label}
      </Label>
      <DateTimePicker name={name} defaultValue={defaultValue} required={required} />
      {(helper || error) && (
        <p className={error ? "text-xs text-erreur-700" : "text-xs text-encre-400"}>
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
