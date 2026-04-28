"use client";

import { useActionState, useState } from "react";
import { ImageOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { toDateTimeLocalValue } from "@/features/sortie/lib/date-fr";
import type { Vibe } from "@/features/sortie/lib/vibe-config";
import { DateTimePicker } from "./date-time-picker";
import { FormField } from "./form-field";
import { MissingImagePicker } from "./create-wizard/missing-image-picker";

const INITIAL: FormActionState = {};

type Props = {
  shortId: string;
  title: string;
  venue: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  ticketUrl: string | null;
  heroImageUrl: string | null;
  vibe: Vibe | null;
};

export function EditOutingForm({
  shortId,
  title,
  venue,
  startsAt,
  deadlineAt,
  ticketUrl,
  heroImageUrl,
  vibe,
}: Props) {
  const [state, formAction, pending] = useActionState(updateOutingAction, INITIAL);
  const errors = state.errors ?? {};
  // L'image n'est pas un champ texte saisi : elle est mutée par le
  // picker via callbacks. On la track localement et on synchronise un
  // hidden input pour que la form action récupère la valeur. État
  // initial = valeur DB ; vide string = "supprimer l'image".
  const [imageUrl, setImageUrl] = useState<string>(heroImageUrl ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="heroImageUrl" value={imageUrl} />

      <ImageEditor
        currentUrl={imageUrl}
        title={title}
        venue={venue ?? ""}
        vibe={vibe}
        open={pickerOpen}
        onToggle={() => setPickerOpen((s) => !s)}
        onPick={(url) => {
          setImageUrl(url);
          setPickerOpen(false);
        }}
        onRemove={() => {
          setImageUrl("");
          setPickerOpen(false);
        }}
      />

      <FormField
        label="Titre"
        name="title"
        required
        maxLength={200}
        defaultValue={title}
        error={errors.title?.[0]}
      />

      {/* En mode vote sans créneau choisi, `startsAt` est null : on
          masque le DateField correspondant et on l'éditer depuis la
          page de la sortie (sondage). Le rsvpDeadline reste éditable
          car il pilote la fermeture du sondage. */}
      <div className={`grid gap-4 ${startsAt ? "sm:grid-cols-2" : ""}`}>
        {startsAt && (
          <DateField
            label="Date et heure"
            name="startsAt"
            required
            defaultValue={toDateTimeLocalValue(startsAt)}
            error={errors.startsAt?.[0]}
          />
        )}
        <DateField
          label="Réponse avant"
          name="rsvpDeadline"
          required
          defaultValue={toDateTimeLocalValue(deadlineAt)}
          error={errors.rsvpDeadline?.[0]}
        />
      </div>
      {!startsAt && (
        <p className="-mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          ↳ date à voter — ajuste les créneaux depuis la page du sondage
        </p>
      )}

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

/**
 * Section image dans le formulaire d'édition. Pattern collapsed par
 * défaut : preview seule + bouton "Modifier l'image" — l'user qui ne
 * vient que pour corriger un titre n'a pas le picker dans les pattes.
 * Au clic, on déploie le MissingImagePicker existant (réutilisé tel quel
 * pour ne pas dupliquer la logique upload / search / grid).
 *
 * "Supprimer l'image" est un text-link discret sous le preview ;
 * passe `imageUrl` à "" et le hero de la page de la sortie tombera sur
 * le visuel par défaut côté détail.
 */
function ImageEditor({
  currentUrl,
  title,
  venue,
  vibe,
  open,
  onToggle,
  onPick,
  onRemove,
}: {
  currentUrl: string;
  title: string;
  venue: string;
  vibe: Vibe | null;
  open: boolean;
  onToggle: () => void;
  onPick: (url: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="text-[13px] font-medium text-ink-500">
        Image
        <span className="ml-1 text-ink-300">(facultatif)</span>
      </Label>

      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          className="aspect-[16/10] w-full rounded-xl border border-ink-200 bg-surface-100 object-cover"
        />
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-dashed border-ink-300 bg-surface-100 text-ink-400">
          <div className="flex flex-col items-center gap-1.5">
            <ImageOff size={22} strokeWidth={1.6} />
            <p className="text-xs font-medium">Aucune image</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-acid-700 underline-offset-4 hover:underline"
        >
          <Pencil size={14} />
          {open ? "Fermer" : currentUrl ? "Modifier l’image" : "Choisir une image"}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
          >
            Supprimer l&rsquo;image
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-hidden rounded-xl border border-ink-200">
          <MissingImagePicker
            title={title}
            venue={venue}
            vibe={vibe}
            onPick={onPick}
            hidePlaceholder
          />
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  name,
  required,
  error,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium text-ink-500">
        {label}
      </Label>
      <DateTimePicker name={name} defaultValue={defaultValue} required={required} />
      {error && <p className="text-xs text-erreur-700">{error}</p>}
    </div>
  );
}
