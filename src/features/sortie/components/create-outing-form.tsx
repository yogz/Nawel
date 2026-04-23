"use client";

import dynamic from "next/dynamic";
import { useActionState, useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createOutingAction, type FormActionState } from "@/features/sortie/actions/outing-actions";
import { computeDeadlineOffsetMs } from "@/features/sortie/actions/schemas";
import { DateTimePicker } from "./date-time-picker";
import { FormField } from "./form-field";

// Heavy client components deferred off the critical path. The paster only
// matters when the user clicks "J'ai le lien"; the timeslot editor only
// matters when they flip mode to vote. Skipping SSR for both — they're
// form inputs, no SEO value, and the skeleton is invisible (they're
// hidden until interaction anyway).
const TicketLinkPaster = dynamic(
  () => import("./ticket-link-paster").then((m) => m.TicketLinkPaster),
  { ssr: false }
);
const TimeslotListEditor = dynamic(
  () => import("./timeslot-list-editor").then((m) => m.TimeslotListEditor),
  { ssr: false }
);

const INITIAL: FormActionState = {};

type Props = {
  defaultCreatorName?: string;
  defaultTitle?: string;
  pasterPlaceholder?: string;
  pasterHint?: string;
  isLoggedIn: boolean;
};

type Mode = "fixed" | "vote";

export function CreateOutingForm({
  defaultCreatorName,
  defaultTitle,
  pasterPlaceholder,
  pasterHint,
  isLoggedIn,
}: Props) {
  const [state, formAction, pending] = useActionState(createOutingAction, INITIAL);
  const [mode, setMode] = useState<Mode>("fixed");
  // Auto-open the paster when the user arrived via a vibe chip — they were
  // primed by the chip ("Théâtre → Fnac Spectacles…") so showing the tool
  // inline has high intent match. Without a vibe they see a discreet link
  // instead, since a blank URL input at the top was confusing first-timers.
  const [showPaster, setShowPaster] = useState(Boolean(pasterHint));
  const errors = state.errors ?? {};

  // Track startsAt so we can preview the auto-deadline to the user and let
  // them override it if the default doesn't match (e.g. popular shows that
  // sell out weeks ahead need an earlier RSVP cut-off).
  const [startsAt, setStartsAt] = useState<string>("");
  const [overrideDeadline, setOverrideDeadline] = useState(false);
  const deadlinePreview = useMemo(() => {
    if (!startsAt) {
      return null;
    }
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const offsetMs = computeDeadlineOffsetMs(date);
    const deadline = new Date(date.getTime() - offsetMs);
    return { offsetMs, deadline };
  }, [startsAt]);

  // Paste-extracted defaults. When the user hits "Remplir" in the paster,
  // we update this and bump `pasteKey` to force the FormField components
  // to remount with the new defaultValue (cheaper than turning every field
  // into a controlled input for a feature the user might not use).
  const [pastedTitle, setPastedTitle] = useState<string | undefined>(defaultTitle);
  const [pastedVenue, setPastedVenue] = useState<string | undefined>();
  const [pastedTicketUrl, setPastedTicketUrl] = useState<string | undefined>();
  const [pastedHeroImage, setPastedHeroImage] = useState<string | undefined>();
  const [pasteKey, setPasteKey] = useState(0);

  function handlePasted(data: {
    title: string | null;
    venue: string | null;
    image: string | null;
    startsAt: string | null;
    ticketUrl: string;
  }) {
    if (data.title) {
      setPastedTitle(data.title);
    }
    if (data.venue) {
      setPastedVenue(data.venue);
    }
    if (data.image) {
      setPastedHeroImage(data.image);
    }
    setPastedTicketUrl(data.ticketUrl);
    setPasteKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {showPaster ? (
        <TicketLinkPaster
          onParsed={handlePasted}
          placeholder={pasterPlaceholder}
          hint={pasterHint}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPaster(true)}
          className="inline-flex items-center gap-1.5 self-start text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
        >
          <Link2 size={14} />
          J&rsquo;ai le lien billetterie (remplir auto)
        </button>
      )}

      <FormField
        key={`title-${pasteKey}`}
        label="Titre de la sortie"
        name="title"
        required
        maxLength={200}
        defaultValue={pastedTitle}
        placeholder="Apéro à l'Ultra Brut"
        error={errors.title?.[0]}
      />

      <ModeToggle mode={mode} onChange={setMode} />
      <input type="hidden" name="mode" value={mode} />

      {mode === "fixed" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startsAt" className="text-[13px] font-medium text-encre-500">
              Date et heure
            </Label>
            <DateTimePicker
              name="startsAt"
              required
              defaultValue={startsAt}
              onChange={setStartsAt}
            />
            <DeadlinePreview
              deadline={deadlinePreview?.deadline ?? null}
              offsetMs={deadlinePreview?.offsetMs ?? null}
              overriding={overrideDeadline}
              onOverride={() => setOverrideDeadline(true)}
              onCancelOverride={() => setOverrideDeadline(false)}
              error={errors.startsAt?.[0] ?? errors.rsvpDeadline?.[0]}
            />
            {overrideDeadline && (
              <div className="mt-2">
                <Label htmlFor="rsvpDeadline" className="text-[13px] font-medium text-encre-500">
                  Fermer les réponses le
                </Label>
                <DateTimePicker name="rsvpDeadline" />
              </div>
            )}
          </div>
        </>
      ) : (
        <TimeslotListEditor hiddenInputName="timeslots" error={errors.timeslots?.[0]} />
      )}

      <FormField
        key={`venue-${pasteKey}`}
        label="Lieu"
        name="venue"
        maxLength={200}
        defaultValue={pastedVenue}
        placeholder="Salle Richelieu · Paris 1er"
        error={errors.venue?.[0]}
      />

      <FormField
        key={`ticket-${pasteKey}`}
        label="Lien billetterie"
        name="ticketUrl"
        type="url"
        defaultValue={pastedTicketUrl}
        placeholder="https://…"
        helper="Quelqu'un achètera les places pour le groupe ? On s'occupe de la comptabilité après."
        error={errors.ticketUrl?.[0]}
      />

      {/* Hero image captured by the paster. Invisible to the user — they
          see a thumbnail above if one was detected. */}
      <input type="hidden" name="heroImageUrl" value={pastedHeroImage ?? ""} />
      {pastedHeroImage && (
        <div className="flex items-center gap-3 rounded-lg border border-encre-100 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote
              ticket-site URLs, next/image remote patterns would need each
              domain whitelisted. Safe here: the URL passed through our
              SSRF-guarded paster. */}
          <img
            src={pastedHeroImage}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover"
          />
          <div className="flex flex-1 flex-col gap-0.5 text-xs">
            <span className="font-semibold text-encre-700">Image détectée depuis le lien</span>
            <button
              type="button"
              onClick={() => setPastedHeroImage(undefined)}
              className="self-start text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
            >
              Retirer
            </button>
          </div>
        </div>
      )}

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
            helper="Pour qu'on te prévienne si quelqu'un répond."
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

function describeDeadlineOffset(offsetMs: number): string {
  const days = Math.round(offsetMs / (24 * 60 * 60 * 1000));
  if (days <= 1) {
    return "24h avant";
  }
  if (days <= 7) {
    return "1 semaine avant";
  }
  if (days <= 14) {
    return "2 semaines avant";
  }
  return "3 semaines avant";
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(date);
}

/**
 * Live preview of the auto-computed deadline shown beneath the event
 * date picker. Short events (<1w away) get a 24h cutoff; ticketed events
 * further out get a 1–3 week heads-up so the organiser has time to book.
 * The "Changer" link hands control back to the creator.
 */
function DeadlinePreview({
  deadline,
  offsetMs,
  overriding,
  onOverride,
  onCancelOverride,
  error,
}: {
  deadline: Date | null;
  offsetMs: number | null;
  overriding: boolean;
  onOverride: () => void;
  onCancelOverride: () => void;
  error?: string;
}) {
  if (error) {
    return <p className="text-xs text-erreur-700">{error}</p>;
  }
  if (!deadline || offsetMs === null) {
    return <p className="text-xs text-encre-400">Les réponses se fermeront 24h avant.</p>;
  }
  if (overriding) {
    return (
      <button
        type="button"
        onClick={onCancelOverride}
        className="self-start text-xs text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
      >
        ← Revenir au défaut ({describeDeadlineOffset(offsetMs)})
      </button>
    );
  }
  return (
    <p className="text-xs text-encre-400">
      Les réponses se ferment{" "}
      <strong className="text-encre-600">{describeDeadlineOffset(offsetMs)}</strong> (
      {formatDateShort(deadline)}).{" "}
      <button
        type="button"
        onClick={onOverride}
        className="text-bordeaux-700 underline-offset-4 hover:underline"
      >
        Changer
      </button>
    </p>
  );
}
