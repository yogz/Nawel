"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarDays,
  Link2,
  Loader2,
  MapPin,
  PartyPopper,
  Pencil,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createOutingAction } from "@/features/sortie/actions/outing-actions";
import { computeDeadlineOffsetMs } from "@/features/sortie/actions/schemas";
import { endOfDayInParis } from "@/features/sortie/lib/date-fr";
import { SortieCalendar } from "../sortie-calendar";
import { TimeDrum } from "../time-drum";
import { SwipeToPublish } from "../swipe-to-publish";
import { VibePicker } from "../vibe-picker";
import { VIBE_CONFIG, defaultStartTimeFor, isVibe, type Vibe } from "../../lib/vibe-config";
import { EventSuggestions } from "./event-suggestions";
import { GeminiSuggestionCard } from "./gemini-suggestion-card";
import { MissingImagePicker } from "./missing-image-picker";
import type { UnifiedEventResult } from "@/app/api/sortie/search-events/route";
import type { EventDetails, FindEventResult } from "@/lib/gemini-search";
import {
  clearWizardDraft,
  persistWizardDraft,
  useStoredWizardDraft,
} from "@/features/sortie/hooks/use-wizard-draft";
import { useWizardTelemetry } from "@/features/sortie/hooks/use-wizard-telemetry";

type Step = "paste" | "title" | "confirm" | "date" | "venue" | "name" | "commit";

type DraftSlot = {
  // Stable id so React can key the list across re-orderings. Generated
  // fresh per slot, never persisted.
  id: string;
  date: Date;
  time: string;
};

type Draft = {
  title: string;
  venue: string;
  ticketUrl: string;
  heroImageUrl: string;
  // Cultural category — pre-filled from the `?vibe=` query param when
  // the user came from a home tile, otherwise chosen on the paste step
  // via `VibePicker`. Optional, so null stays a valid state.
  vibe: Vibe | null;
  // Pending picker draft on the when-step. Merged into `slots` at
  // publish time (so a single filled picker = fixed-mode sortie).
  date: Date | null;
  time: string | null;
  // True dès que l'utilisateur a explicitement choisi une heure via le
  // picker. Tant qu'il est false, changer de vibe ré-aligne l'heure sur
  // le défaut de la nouvelle catégorie (cf. `defaultStartTimeFor`).
  timeTouched: boolean;
  // Committed alternative slots from the when-step ghost-row. 0–7
  // entries — the pending picker contributes the 8th at publish.
  // Final count decides the mode: 1 slot → fixed, 2+ → vote.
  slots: DraftSlot[];
  // Custom RSVP deadline override. `null` = use the server-side
  // auto-computed default (24h / 1w / 2w / 3w before depending on how
  // far out the event is).
  rsvpDeadline: Date | null;
  creatorDisplayName: string;
  creatorEmail: string;
};

type Props = {
  isLoggedIn: boolean;
  defaultCreatorName?: string;
  vibeKey: string | null;
  defaultTitle?: string;
};

const ALL_STEPS: ReadonlySet<Step> = new Set([
  "paste",
  "title",
  "confirm",
  "date",
  "venue",
  "name",
  "commit",
]);

// Traduction des noms de champs Zod en termes user-facing. Le serveur
// renvoie `creatorEmail`, `creatorDisplayName`, etc. — exposer ça brut
// trahit la stack technique et désoriente le user (qui ne reconnaît
// pas son propre champ). Mappage manuel parce qu'il y a moins de
// 10 champs et que ça n'évolue pas vite ; un fallback sur le nom brut
// en cas d'oubli plutôt qu'un crash.
const FIELD_LABELS_FR: Record<string, string> = {
  title: "Titre",
  venue: "Lieu",
  ticketUrl: "Lien de billetterie",
  heroImageUrl: "Image",
  startsAt: "Date",
  rsvpDeadline: "Date limite de réponse",
  vibe: "Catégorie",
  creatorDisplayName: "Prénom",
  creatorEmail: "Email",
  mode: "Mode",
  timeslots: "Créneaux proposés",
};

/**
 * Reconvertit un payload localStorage en `{ draft, step }` typé. Les
 * Date sont stockées en ISO via JSON.stringify natif et reconverties
 * ici. Toute incohérence (champ manquant, mauvais type, ISO invalide)
 * → null, le caller ignore le restore plutôt que de booter en l'état
 * cassé.
 */
function tryRestoreDraft(payload: unknown): { draft: Draft; step: Step } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const rawDraft = obj.draft as Record<string, unknown> | undefined;
  const rawStep = obj.step;
  if (!rawDraft || typeof rawDraft !== "object") {
    return null;
  }
  if (typeof rawStep !== "string" || !ALL_STEPS.has(rawStep as Step)) {
    return null;
  }
  const parseDate = (v: unknown): Date | null => {
    if (typeof v !== "string") {
      return null;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const slotsRaw = Array.isArray(rawDraft.slots) ? rawDraft.slots : [];
  const slots: DraftSlot[] = [];
  for (const s of slotsRaw) {
    if (!s || typeof s !== "object") {
      continue;
    }
    const sObj = s as Record<string, unknown>;
    const date = parseDate(sObj.date);
    const time = typeof sObj.time === "string" ? sObj.time : null;
    const id = typeof sObj.id === "string" ? sObj.id : null;
    if (date && time && id) {
      slots.push({ id, date, time });
    }
  }
  const draft: Draft = {
    title: typeof rawDraft.title === "string" ? rawDraft.title : "",
    venue: typeof rawDraft.venue === "string" ? rawDraft.venue : "",
    ticketUrl: typeof rawDraft.ticketUrl === "string" ? rawDraft.ticketUrl : "",
    heroImageUrl: typeof rawDraft.heroImageUrl === "string" ? rawDraft.heroImageUrl : "",
    vibe: isVibe(rawDraft.vibe as string | null) ? (rawDraft.vibe as Vibe) : null,
    date: parseDate(rawDraft.date),
    time: typeof rawDraft.time === "string" ? rawDraft.time : null,
    // Au restore on conserve l'intent : si l'user avait choisi une heure
    // dans la session précédente, on ne la réécrira pas en changeant de
    // vibe à la reprise. Drafts pré-PR3 sans le champ → false (l'heure
    // stockée est probablement le défaut "20:00" historique).
    timeTouched: typeof rawDraft.timeTouched === "boolean" ? rawDraft.timeTouched : false,
    slots,
    rsvpDeadline: parseDate(rawDraft.rsvpDeadline),
    creatorDisplayName:
      typeof rawDraft.creatorDisplayName === "string" ? rawDraft.creatorDisplayName : "",
    creatorEmail: typeof rawDraft.creatorEmail === "string" ? rawDraft.creatorEmail : "",
  };
  // Sanity check : un draft "vide" (juste des defaults) n'a aucun
  // intérêt à être restauré — on laisse l'utilisateur démarrer net.
  if (
    !draft.title &&
    !draft.venue &&
    !draft.ticketUrl &&
    !draft.heroImageUrl &&
    !draft.date &&
    draft.slots.length === 0 &&
    !draft.creatorDisplayName &&
    !draft.creatorEmail
  ) {
    return null;
  }
  return { draft, step: rawStep as Step };
}

const STEPS_FIXED: Step[] = ["paste", "confirm", "date", "venue", "name", "commit"];
const STEPS_MANUAL: Step[] = ["paste", "title", "date", "venue", "name", "commit"];

function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h ?? 20, m ?? 0, 0, 0);
  return next;
}

// Cf. la note dans `date-time-picker.tsx` : on émet un ISO UTC avec
// `Z`, pas un `YYYY-MM-DDTHH:mm` ambigu, sinon le serveur (Vercel = UTC)
// re-parse comme heure UTC une saisie qui était en heure Paris.
function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

// Mirror of the server's `safeHttpUrl` refinement, kept in sync by hand.
// The wizard pre-filters URLs so pasted values that happen to be
// oversized / malformed don't bubble back as a cryptic Zod union error.
function isSafeHttpUrl(raw: string): boolean {
  if (!raw || raw.length > 2048) {
    return false;
  }
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Minimal email check — mirrors the shape Zod's `.email()` accepts
// without trying to be RFC-complete. Used both inline (to disable the
// Next button when the field is non-empty but invalid) and at submit
// (to drop a lingering invalid value rather than send it to the server).
function isValidEmail(raw: string): boolean {
  if (!raw || raw.length > 255) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

/**
 * Dapp-style create wizard. Replaces the long scroll form at /nouvelle
 * with full-screen step cards, big tap targets, gesture-first publish.
 * State-machine is intentionally simple — each step pushes a fixed
 * "next" step (computed by `stepsFor` based on prior inputs). The URL
 * stays on /nouvelle the whole time; back-button exits the flow.
 *
 * Vote-mode (sondage de dates) is not a separate route or toggle — on
 * the when-step, tapping "Proposer une autre date" commits the current
 * picker into a slot list and lets the user add up to 7 more. Publish
 * derives the mode from the final count (1 → fixed, 2+ → vote), so the
 * user never sees the word "sondage" until the invite is sent.
 */
export function CreateWizard({ isLoggedIn, defaultCreatorName, vibeKey, defaultTitle }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const telemetry = useWizardTelemetry(step);
  const [draft, setDraft] = useState<Draft>(() => {
    const initialVibe = isVibe(vibeKey) ? vibeKey : null;
    return {
      title: defaultTitle ?? "",
      venue: "",
      ticketUrl: "",
      heroImageUrl: "",
      vibe: initialVibe,
      date: null,
      time: defaultStartTimeFor(initialVibe),
      timeTouched: false,
      slots: [],
      rsvpDeadline: null,
      creatorDisplayName: defaultCreatorName ?? "",
      creatorEmail: "",
    };
  });
  const [pasteFailed, setPasteFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hint affiché quand le scraping ne peut rien remonter de la page :
  //   - "waf" : groupe CTS Eventim (Fnac Spectacles, France Billet…)
  //   - "spa" : site rendu côté client (Pathé, UGC…)
  // Dans les deux cas on a quand même tenté Discovery / slug, mais
  // on annonce à l'utilisateur qu'une autre source fonctionne mieux.
  const [parserHint, setParserHint] = useState<{
    kind: "waf" | "spa";
    siteName: string;
    suggestion: string;
  } | null>(null);

  // Persistance localStorage du brouillon : un coup de fil entrant qui
  // kill la webview ou un swipe-up Safari accidentel ne fait plus
  // perdre tout le travail. Lecture en useEffect pour éviter le
  // hydration mismatch (pattern recommandé par React.dev).
  const { stored: storedDraft, dismiss: dismissStoredDraft } = useStoredWizardDraft();
  const [restorePromptDismissed, setRestorePromptDismissed] = useState(false);

  // Sauvegarde debounced du brouillon. 500 ms est un compromis : assez
  // court pour ne pas perdre une édition récente, assez long pour ne
  // pas faire un write par caractère sur les inputs textuels.
  useEffect(() => {
    const handle = setTimeout(() => {
      persistWizardDraft({ draft, step, savedAt: Date.now() });
    }, 500);
    return () => clearTimeout(handle);
  }, [draft, step]);

  function applyStoredDraft(payload: unknown) {
    const restored = tryRestoreDraft(payload);
    if (!restored) {
      return;
    }
    setDraft(restored.draft);
    setStep(restored.step);
    dismissStoredDraft();
  }

  // Step filtering builds the actual flow based on what we already know:
  //   - Paste branch vs manual entry (paster success vs fallback)
  //   - Skip `name` for logged-in users (session has the identity)
  //   - Skip `venue` once we have one (from the paster or typed inline on
  //     the confirm card) — asking again is pure friction. Guard on
  //     `step !== "venue"` so the step doesn't disappear while the user
  //     is actively typing into it.
  const steps = useMemo<Step[]>(() => {
    const usePasteBranch = (draft.title.length > 0 || draft.ticketUrl.length > 0) && !pasteFailed;
    const base = usePasteBranch ? STEPS_FIXED : STEPS_MANUAL;
    let filtered = isLoggedIn ? base.filter((s) => s !== "name") : base;
    // Title-only input (no URL, no venue, no image) → nothing to review
    // on the confirm card, skip it. The Gemini fallback typically gives
    // us title + venue + image without ticketUrl, and that DOES need a
    // confirm step (otherwise advanceFrom("confirm") falls back to
    // steps[0] = "paste" and the wizard loops on itself).
    const hasNothingToConfirm =
      draft.title.length > 0 &&
      draft.ticketUrl.length === 0 &&
      draft.venue.trim().length === 0 &&
      !draft.heroImageUrl;
    // Garde `step !== "confirm"` symétrique à celui sur "venue" plus
    // bas : si l'utilisateur édite le confirm card et vide le venue
    // d'un coup, la step ne doit pas disparaître sous ses pieds (la
    // state machine se retrouverait en `stepIndex === -1`).
    if (hasNothingToConfirm && step !== "confirm") {
      filtered = filtered.filter((s) => s !== "confirm");
    }
    if (draft.venue.trim().length > 0 && step !== "venue") {
      filtered = filtered.filter((s) => s !== "venue");
    }
    return filtered;
  }, [draft.title, draft.ticketUrl, draft.venue, pasteFailed, isLoggedIn, step]);

  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  function goToStep(next: Step) {
    setStep(next);
  }

  function advanceFrom(current: Step) {
    const visible = steps;
    const idx = visible.indexOf(current);
    const next = visible[idx + 1];
    if (next) {
      setStep(next);
    }
  }

  function back() {
    const idx = steps.indexOf(step);
    if (idx > 0) {
      telemetry.markBack();
      setStep(steps[idx - 1]!);
      return;
    }
    // On the first step, exit the wizard. Prefer `router.back()` so the
    // user returns to where they came from (typically the home page with
    // their vibe chip still in view); fall back to a hard push if there's
    // no history to pop — e.g., /nouvelle was opened directly from a link.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function publish() {
    setError(null);
    const fd = new FormData();
    fd.set("title", draft.title);

    // Merge the picker's pending draft into the committed slots — the
    // WhenStep keeps them separate so inline editing stays smooth, but
    // at publish time they're all just "slots to submit". Mode is
    // derived from the final count: 1 → fixed, 2+ → vote. The user
    // never chose a mode.
    const allSlots: Array<{ date: Date; time: string }> = draft.slots.map((s) => ({
      date: s.date,
      time: s.time,
    }));
    if (draft.date && draft.time) {
      allSlots.push({ date: draft.date, time: draft.time });
    }

    if (allSlots.length === 0) {
      setError("Choisis une date et une heure.");
      return;
    }

    const publishMode: "fixed" | "vote" = allSlots.length === 1 ? "fixed" : "vote";
    if (publishMode === "fixed") {
      const only = allSlots[0]!;
      const startsAt = combineDateAndTime(only.date, only.time);
      fd.set("mode", "fixed");
      fd.set("startsAt", toUtcIsoString(startsAt));
    } else {
      // Server schema expects a JSON-encoded array of
      // { startsAt, position }. Position preserves the add order.
      const slotsJson = allSlots.map((s, idx) => ({
        startsAt: toUtcIsoString(combineDateAndTime(s.date, s.time)),
        position: idx,
      }));
      fd.set("mode", "vote");
      fd.set("timeslots", JSON.stringify(slotsJson));
    }

    if (draft.rsvpDeadline) {
      fd.set("rsvpDeadline", toUtcIsoString(draft.rsvpDeadline));
    }
    if (draft.venue) {
      fd.set("venue", draft.venue);
    }
    // Pre-filter URLs so a quirky one from the paster (non-http/https, too
    // long, truncated) doesn't bubble up as a cryptic Zod "Invalid input".
    // The server re-validates anyway — this is just for the happy path.
    if (draft.ticketUrl && isSafeHttpUrl(draft.ticketUrl)) {
      fd.set("ticketUrl", draft.ticketUrl);
    }
    if (draft.heroImageUrl && isSafeHttpUrl(draft.heroImageUrl)) {
      fd.set("heroImageUrl", draft.heroImageUrl);
    }
    if (draft.vibe) {
      fd.set("vibe", draft.vibe);
    }
    // The server schema requires `creatorDisplayName` (min length 1) for
    // both branches — the action ignores it for logged-in users but the
    // Zod validator doesn't know that, so we have to ship *something*.
    // Fall back to "Moi" if the user somehow has no name on file.
    fd.set(
      "creatorDisplayName",
      isLoggedIn
        ? defaultCreatorName?.trim() || "Moi"
        : draft.creatorDisplayName.trim() || "Anonyme"
    );
    if (!isLoggedIn) {
      // Same pre-filter pattern as URLs — if the typed email doesn't
      // pass a basic shape check, drop it rather than sending an
      // invalid value the server would reject with "Invalid input".
      if (draft.creatorEmail && isValidEmail(draft.creatorEmail)) {
        fd.set("creatorEmail", draft.creatorEmail);
      }
    } else {
      fd.set("showOnProfile", "on");
    }
    // Clear localStorage AVANT le serveur action — sur succès le
    // server-side redirect prend le relais (on ne repasse pas par
    // ici), donc c'est notre seule chance de nettoyer. Sur erreur,
    // l'état React du wizard reste intact et le user peut retenter.
    clearWizardDraft();
    telemetry.onPublishStarted(publishMode, isLoggedIn);
    // Optimistic success tracking : on succès le redirect serveur
    // empêche d'arriver après l'await, donc on émet l'event juste
    // avant. Si le serveur retourne une erreur, on émettra un
    // `publish_failed` après — l'analytique tolère le doublon.
    telemetry.onPublishSucceeded({
      mode: publishMode,
      isLoggedIn,
      hasEmail: !isLoggedIn && draft.creatorEmail.length > 0,
      hasVenue: draft.venue.trim().length > 0,
      hasTicketUrl: draft.ticketUrl.length > 0,
      hasHeroImage: draft.heroImageUrl.length > 0,
    });
    const result = await createOutingAction({}, fd);
    // Success = server-side redirect, so we only land here on error.
    if (result?.message) {
      telemetry.onPublishFailed("server");
      setError(result.message);
      throw new Error(result.message);
    }
    if (result?.errors) {
      telemetry.onPublishFailed("validation");
      // Surface the offending field name alongside the message — a bare
      // "Invalid input" with no context was impossible to debug live.
      const entry = Object.entries(result.errors)[0];
      const firstField = entry?.[0];
      const firstMessage = entry?.[1]?.[0];
      const friendlyField = firstField ? (FIELD_LABELS_FR[firstField] ?? null) : null;
      setError(
        friendlyField && firstMessage
          ? `${friendlyField} : ${firstMessage}`
          : (firstMessage ?? "Un champ manque.")
      );
      throw new Error("validation");
    }
  }

  // Le banner de restore apparaît si on a détecté un brouillon stocké
  // valide ET que l'utilisateur ne l'a pas encore tranché. On le place
  // au-dessus du contenu de la step pour ne pas masquer la step active.
  const showRestorePrompt =
    !restorePromptDismissed &&
    storedDraft !== null &&
    storedDraft !== false &&
    tryRestoreDraft(storedDraft.payload) !== null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-surface-100">
      <WizardHeader progress={progress} onBack={back} />

      {showRestorePrompt && storedDraft && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="border-b border-acid-100 bg-acid-50/70 px-6 py-3"
          role="region"
          aria-label="Brouillon retrouvé"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-ink-700">Brouillon retrouvé</span> — tu avais
              commencé une sortie il y a peu.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  applyStoredDraft(storedDraft.payload);
                  setRestorePromptDismissed(true);
                }}
                className="rounded-full bg-acid-600 px-4 py-1.5 text-xs font-bold text-surface-50 transition-colors hover:bg-acid-700"
              >
                Reprendre
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWizardDraft();
                  dismissStoredDraft();
                  setRestorePromptDismissed(true);
                }}
                className="text-xs font-semibold text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
              >
                Recommencer
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="min-h-full"
          >
            {step === "paste" && (
              <PasteStep
                vibe={draft.vibe}
                onVibeChange={(vibe) =>
                  setDraft((d) => ({
                    ...d,
                    vibe,
                    // Réaligne l'heure sur le défaut de la nouvelle vibe
                    // tant que l'user n'en a pas choisi une lui-même.
                    time: d.timeTouched ? d.time : defaultStartTimeFor(vibe),
                  }))
                }
                onPasteSubmitted={telemetry.onPasteSubmitted}
                onSuggestionPicked={telemetry.onSuggestionPicked}
                onGeminiStarted={telemetry.onGeminiStarted}
                onParsed={(data) => {
                  // JSON-LD often ships a full startsAt — split it back
                  // into the wizard's date + time fields so step 3 lands
                  // pre-selected on the right day and hour.
                  let parsedDate: Date | null = null;
                  let parsedTime: string | null = null;
                  if (data.startsAt) {
                    const d = new Date(data.startsAt);
                    if (!Number.isNaN(d.getTime())) {
                      parsedDate = d;
                      parsedTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    }
                  }
                  setDraft((d) => ({
                    ...d,
                    title: data.title ?? d.title,
                    venue: data.venue ?? d.venue,
                    ticketUrl: data.ticketUrl,
                    heroImageUrl: data.image ?? d.heroImageUrl,
                    date: parsedDate ?? d.date,
                    time: parsedTime ?? d.time,
                  }));
                  setPasteFailed(false);
                  setParserHint(data.parserHint ?? null);
                  goToStep("confirm");
                }}
                onTitleOnly={(title) => {
                  // Plain-text input — no URL to parse, so no confirm
                  // step to show (the steps memo skips it when there
                  // is no ticketUrl). Jump straight to the date picker.
                  setDraft((d) => ({
                    ...d,
                    title,
                    ticketUrl: "",
                    heroImageUrl: "",
                  }));
                  setPasteFailed(false);
                  goToStep("date");
                }}
              />
            )}
            {step === "confirm" && (
              <ConfirmPasteStep
                draft={draft}
                parserHint={parserHint}
                onTitleChange={(title) => setDraft((d) => ({ ...d, title }))}
                onVenueChange={(venue) => setDraft((d) => ({ ...d, venue }))}
                onImageBroken={() => setDraft((d) => ({ ...d, heroImageUrl: "" }))}
                onImagePick={(heroImageUrl) => setDraft((d) => ({ ...d, heroImageUrl }))}
                onNext={() => advanceFrom("confirm")}
              />
            )}
            {step === "title" && (
              <TitleStep
                value={draft.title}
                onChange={(title) => setDraft((d) => ({ ...d, title }))}
                onNext={() => advanceFrom("title")}
              />
            )}
            {step === "date" && (
              <WhenStep
                title={draft.title}
                slots={draft.slots}
                pendingDate={draft.date}
                pendingTime={draft.time}
                deadline={draft.rsvpDeadline}
                onSlotsChange={(slots) => setDraft((d) => ({ ...d, slots }))}
                onPendingDateChange={(date) => setDraft((d) => ({ ...d, date }))}
                onPendingTimeChange={(time) => setDraft((d) => ({ ...d, time, timeTouched: true }))}
                onDeadlineChange={(rsvpDeadline) => setDraft((d) => ({ ...d, rsvpDeadline }))}
                onNext={() => advanceFrom("date")}
              />
            )}
            {step === "venue" && (
              <VenueStep
                title={draft.title}
                value={draft.venue}
                onChange={(venue) => setDraft((d) => ({ ...d, venue }))}
                onNext={() => advanceFrom("venue")}
                onSkip={() => advanceFrom("venue")}
              />
            )}
            {step === "name" && (
              <NameStep
                title={draft.title}
                name={draft.creatorDisplayName}
                email={draft.creatorEmail}
                onNameChange={(creatorDisplayName) =>
                  setDraft((d) => ({ ...d, creatorDisplayName }))
                }
                onEmailChange={(creatorEmail) => setDraft((d) => ({ ...d, creatorEmail }))}
                onNext={() => advanceFrom("name")}
              />
            )}
            {step === "commit" && (
              <CommitStep draft={draft} isLoggedIn={isLoggedIn} error={error} onPublish={publish} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function WizardHeader({ progress, onBack }: { progress: number; onBack: () => void }) {
  return (
    <header
      className="relative flex shrink-0 items-center border-b border-ink-100 px-4 pb-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Retour"
        className="grid size-10 place-items-center rounded-full text-ink-500 transition-colors hover:bg-surface-200 hover:text-ink-700"
      >
        <ArrowLeft size={20} />
      </button>
      <span className="ml-3 text-xs font-black uppercase tracking-[0.18em] text-ink-400">
        Nouvelle sortie
      </span>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-acid-100">
        <div
          className="h-full bg-acid-600 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}

/**
 * Chip de contexte affichée sur les steps post-titre (date, lieu, nom,
 * commit) pour rappeler à l'user quel événement il est en train de
 * configurer. Sans ça, le H1 identitaire de chaque step ("C'est quand ?",
 * "Où ça se passe ?", etc.) ne dit pas DE QUOI on parle — fil conducteur
 * cassé sur les flows multi-step.
 *
 * Style délibérément discret : pas de lime (réservé au focus actif),
 * pas d'icône (l'eyebrow porte déjà le repère de step), truncate sur
 * overflow (jamais de wrap ni de scroll horizontal). Non-interactive
 * pour l'instant — l'édition via back-button reste accessible.
 */
function WizardContextChip({ title }: { title: string }) {
  if (!title.trim()) {
    return null;
  }
  return (
    <span
      className="mt-2 inline-flex max-w-full items-center rounded-full border border-ink-300/40 bg-surface-100/40 px-3 py-1.5 text-sm font-medium text-ink-500"
      title={title}
    >
      <span className="truncate">{title}</span>
    </span>
  );
}

/**
 * Best-effort Ticketmaster search hook. Fires a debounced POST to our
 * search endpoint when the user types non-URL text ≥3 chars. Aborts in
 * flight requests on input change so we don't paint stale suggestions.
 * Any failure (network, key missing, no match) → empty array, silent.
 *
 * The "should we even show suggestions" gate is derived (not stored)
 * to avoid an effect that synchronously calls setState on the invalid
 * branch — react-hooks/set-state-in-effect rule. When the input falls
 * below the threshold we just return `[]` directly.
 */
type EventSuggestionsState = {
  results: UnifiedEventResult[];
  correctedQuery: string | null;
  isLoading: boolean;
};

const EMPTY_SUGGESTIONS: EventSuggestionsState = {
  results: [],
  correctedQuery: null,
  isLoading: false,
};

function useEventSuggestions(query: string, enabled: boolean): EventSuggestionsState {
  const [state, setState] = useState<EventSuggestionsState>(EMPTY_SUGGESTIONS);
  const abortRef = useRef<AbortController | null>(null);
  const shouldFetch = enabled && query.length >= 3;

  useEffect(() => {
    if (!shouldFetch) {
      // Reset complet quand l'input redescend sous 3 chars / mode URL :
      // sinon on garderait des results périmés visibles à la prochaine
      // activation de l'autocomplete.
      setState(EMPTY_SUGGESTIONS);
      return;
    }
    // Loading state immédiat (avant même le debounce de 400 ms) — c'est
    // ça qui supprime le moment "rien ne se passe" pendant ~700 ms.
    setState((prev) => ({ ...prev, isLoading: true }));
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch("/api/sortie/search-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
        .then((res) =>
          res.ok
            ? (res.json() as Promise<{
                results: UnifiedEventResult[];
                correctedQuery: string | null;
              }>)
            : { results: [], correctedQuery: null }
        )
        .then((data) => {
          if (!controller.signal.aborted) {
            setState({
              results: Array.isArray(data.results) ? data.results : [],
              correctedQuery: typeof data.correctedQuery === "string" ? data.correctedQuery : null,
              isLoading: false,
            });
          }
        })
        .catch(() => {
          // Silent: best-effort enrichment.
          if (!controller.signal.aborted) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        });
    }, 400);
    return () => {
      clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query, shouldFetch]);

  return shouldFetch ? state : EMPTY_SUGGESTIONS;
}

function PasteStep({
  vibe,
  onVibeChange,
  onParsed,
  onTitleOnly,
  onPasteSubmitted,
  onSuggestionPicked,
  onGeminiStarted,
}: {
  vibe: Vibe | null;
  onVibeChange: (next: Vibe | null) => void;
  onParsed: (data: {
    title: string | null;
    venue: string | null;
    image: string | null;
    startsAt: string | null;
    ticketUrl: string;
    parserHint?: { kind: "waf" | "spa"; siteName: string; suggestion: string } | null;
  }) => void;
  onTitleOnly: (title: string) => void;
  onPasteSubmitted: (kind: "url" | "text", hasVibe: boolean) => void;
  onSuggestionPicked: (source: "tm" | "oa" | "gemini") => void;
  onGeminiStarted: (
    trigger: "auto" | "optin" | "bg"
  ) => (outcome: "found" | "not_found" | "cancelled" | "error") => void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<"parse" | "search">("parse");
  const [err, setErr] = useState<string | null>(null);
  const [geminiSuggestion, setGeminiSuggestion] = useState<EventDetails | null>(null);
  // URL en attente de recherche IA opt-in : set quand le parser OG/JSON-LD
  // a échoué (URL injouable côté serveur — WAF, SPA, page introuvable).
  // Plutôt que d'enchaîner Gemini automatiquement (15 s d'attente piégée),
  // on garde l'URL ici et on propose un bouton "Chercher pour moi" qui
  // déclenche tryGemini à la demande. Reset au prochain submit ou à un
  // succès Gemini.
  const [geminiOptInUrl, setGeminiOptInUrl] = useState<string | null>(null);

  // Tapping a vibe chip retunes the placeholder + hint to match the
  // category, so the examples in the input track what the user just said
  // they're planning. Falls back to generic copy when no vibe is picked
  // (or "autre", which has no dedicated config).
  const vibeConfig = vibe ? (VIBE_CONFIG[vibe] ?? null) : null;
  const placeholder = vibeConfig?.pasterPlaceholder;
  const hint = vibeConfig?.pasterHint;

  const trimmed = value.trim();
  // Treat anything starting with http(s) as a ticket URL to parse.
  // Everything else we treat as a plain title — the creator just
  // wants to name the event and move on.
  const looksLikeUrl = /^https?:\/\//i.test(trimmed);

  // Best-effort enrichment: when the user is typing free text, ping
  // toutes les sources d'événements en parallèle (Ticketmaster +
  // OpenAgenda + …) et surface jusqu'à 6 matches dédoublonnés sous
  // l'input. Picking one short-circuits the rest of the wizard's URL
  // pipeline (same `onParsed` callback as the actual paste flow).
  // `correctedQuery` est non-null quand l'orchestrateur a corrigé une
  // faute d'orthographe ("rolland" → "roland") via la spellcheck TM —
  // affiché au-dessus de la liste.
  const {
    results: suggestions,
    correctedQuery,
    isLoading: suggestionsLoading,
  } = useEventSuggestions(trimmed, !looksLikeUrl);

  // Mémoise les queries texte libre déjà tentées en background pour
  // ne pas reboucler indéfiniment quand l'effet ré-évalue ses deps.
  // Une string par query consume O(n) mémoire ; en pratique l'user
  // tape <30 versions d'une recherche par session.
  const bgGeminiTriedRef = useRef<Set<string>>(new Set());

  // Background Gemini sur path texte libre : si Ticketmaster /
  // OpenAgenda n'ont rien remonté après 2 s, on lance Gemini sans
  // bloquer le bouton Continuer. Si Gemini répond avant que l'user
  // clique Continuer, la GeminiSuggestionCard apparaît normalement.
  // Si l'user clique Continuer pendant le fetch, submit() abort la
  // requête et passe directement en onTitleOnly (cf. plus bas).
  useEffect(() => {
    if (
      looksLikeUrl ||
      pending ||
      geminiSuggestion ||
      suggestionsLoading ||
      suggestions.length > 0 ||
      trimmed.length < 4 ||
      bgGeminiTriedRef.current.has(trimmed)
    ) {
      return;
    }
    const handle = setTimeout(() => {
      bgGeminiTriedRef.current.add(trimmed);
      // Fire-and-forget : l'éventuel résultat est consommé via
      // `setGeminiSuggestion` à l'intérieur de tryGemini. Pas de
      // gestion d'erreur ici, c'est best-effort.
      void tryGemini(trimmed, "bg");
    }, 2000);
    return () => clearTimeout(handle);
  }, [trimmed, looksLikeUrl, pending, geminiSuggestion, suggestionsLoading, suggestions.length]);

  // Fallback Gemini : appelle /api/sortie/find-event quand l'URL n'est
  // pas parseable ou que l'utilisateur tape un texte libre sans hit
  // Ticketmaster. Latence 12-15s, donc déclenché uniquement après
  // l'échec des autres voies. Retourne true si une suggestion a été
  // posée, false sinon (le caller décide du fallback final).
  // L'AbortController est exposé via une ref pour que le bouton
  // Annuler du loading state puisse interrompre le fetch côté client
  // (le serveur continue mais on jette la réponse).
  const geminiAbortRef = useRef<AbortController | null>(null);
  // `trigger` est passé jusqu'au helper télémétrie : `optin` = bouton
  // "Chercher pour moi/avec l'IA" cliqué (URL ou texte), `bg` =
  // background sur texte libre sans hit TM/OA. Le mode `auto`
  // (chaînage blocking après échec) n'est plus émis, gardé dans le
  // type union pour compat des dashboards Umami historiques.
  async function tryGemini(query: string, trigger: "auto" | "optin" | "bg"): Promise<boolean> {
    geminiAbortRef.current?.abort();
    const controller = new AbortController();
    geminiAbortRef.current = controller;
    const finalizeTelemetry = onGeminiStarted(trigger);
    try {
      const res = await fetch("/api/sortie/find-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      const data = (await res.json()) as FindEventResult;
      if (controller.signal.aborted) {
        finalizeTelemetry("cancelled");
        return false;
      }
      if (data.found && data.data) {
        setGeminiSuggestion(data.data);
        finalizeTelemetry("found");
        return true;
      }
      finalizeTelemetry("not_found");
      return false;
    } catch (err) {
      // `AbortError` arrive aussi via le catch (vs le check `aborted`
      // ci-dessus) selon l'environnement — on ne veut pas le compter
      // comme une erreur applicative.
      if (controller.signal.aborted) {
        finalizeTelemetry("cancelled");
      } else {
        finalizeTelemetry("error");
      }
      return false;
    } finally {
      if (geminiAbortRef.current === controller) {
        geminiAbortRef.current = null;
      }
    }
  }

  function cancelGemini() {
    geminiAbortRef.current?.abort();
    geminiAbortRef.current = null;
    setPending(false);
    setErr(null);
  }

  /**
   * Pipeline URL : parse OG/JSON-LD seulement. En cas d'échec, on
   * remonte l'erreur immédiatement et on stocke l'URL pour proposer
   * une recherche IA opt-in via le bouton "Chercher pour moi" — au
   * lieu de piéger l'user dans 15 s d'attente Gemini automatique.
   *
   * Extrait pour pouvoir être déclenché à la fois depuis le bouton
   * "Remplir automatiquement" (via submit()) et depuis l'auto-fetch
   * sur paste (handlePaste, sans cliquer).
   */
  async function runUrlPipeline(url: string) {
    setErr(null);
    setGeminiSuggestion(null);
    setGeminiOptInUrl(null);
    setPending(true);
    setPendingMsg("parse");
    onPasteSubmitted("url", vibe != null);
    try {
      const res = await fetch("/api/sortie/parse-ticket-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        onParsed(await res.json());
        return;
      }
      setErr("Lien illisible — chercher pour toi ou retape juste le nom de la sortie.");
      setGeminiOptInUrl(url);
    } finally {
      setPending(false);
    }
  }

  /**
   * Lance Gemini à la demande sur l'URL stockée par `runUrlPipeline`.
   * Trigger `optin` côté télémétrie pour distinguer du fallback `auto`
   * historique. Consume le state opt-in en début pour que le bouton
   * disparaisse immédiatement et ne puisse pas être re-cliqué pendant
   * que la requête est en vol.
   */
  async function runGeminiOptIn() {
    if (!geminiOptInUrl) {
      return;
    }
    const url = geminiOptInUrl;
    setGeminiOptInUrl(null);
    setErr(null);
    setPending(true);
    setPendingMsg("search");
    try {
      const found = await tryGemini(url, "optin");
      if (!found) {
        setErr("On n'a rien trouvé non plus — entre juste le nom de la sortie.");
      }
    } finally {
      setPending(false);
    }
  }

  /**
   * Opt-in Gemini sur path texte quand TM/OA a renvoyé des cards mais
   * qu'aucune ne colle. Symétrique à `runGeminiOptIn` (path URL) : le
   * clic Continuer reste un shortcut rapide vers `onTitleOnly`, et
   * l'user qui veut l'IA passe par ce bouton dédié au coût annoncé.
   *
   * Si Gemini ne trouve rien, on avance silencieusement avec le texte
   * tapé — l'user a DÉJÀ entré un nom, lui afficher "entre juste le
   * nom" serait absurde. Le message d'erreur du runGeminiOptIn URL ne
   * s'applique pas ici parce que l'input n'est pas une URL.
   */
  async function runGeminiOptInText() {
    if (!trimmed) {
      return;
    }
    setErr(null);
    setPending(true);
    setPendingMsg("search");
    try {
      const found = await tryGemini(trimmed, "optin");
      if (!found) {
        onTitleOnly(trimmed);
      }
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (!trimmed) {
      return;
    }
    if (looksLikeUrl) {
      await runUrlPipeline(trimmed);
      return;
    }
    setErr(null);
    setGeminiSuggestion(null);
    setGeminiOptInUrl(null);
    onPasteSubmitted("text", vibe != null);
    // Path texte : on ne lance JAMAIS Gemini en blocking au submit. Si
    // l'user veut l'IA, c'est via le bouton opt-in dédié. Le clic
    // Continuer = "j'avance avec ce que j'ai tapé", point. Tout bg en
    // vol est aborté pour ne pas faire apparaître une card Gemini en
    // décalage sur la step suivante.
    geminiAbortRef.current?.abort();
    onTitleOnly(trimmed);
  }

  /**
   * Auto-fetch quand l'utilisateur colle une URL : fire le pipeline
   * immédiatement sans attendre un clic sur "Remplir automatiquement".
   * Trigger uniquement sur paste explicite (pas sur typing) pour ne
   * pas spam le serveur pendant que l'user compose une URL caractère
   * par caractère.
   */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    if (pending) {
      return;
    }
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted || !/^https?:\/\//i.test(pasted)) {
      return;
    }
    // L'event default va aussi déposer le texte dans l'input — on
    // écrase juste pour s'assurer que la value reflète bien l'URL
    // collée (cas où l'user remplace une sélection partielle).
    setValue(pasted);
    void runUrlPipeline(pasted);
  }

  function acceptSuggestion({ skipImage }: { skipImage: boolean }) {
    if (!geminiSuggestion) {
      return;
    }
    onSuggestionPicked("gemini");
    const venueLine = [geminiSuggestion.venue, geminiSuggestion.city].filter(Boolean).join(", ");
    // Pré-sélectionne la vibe détectée si différente d'"autre" et qu'aucune
    // n'était déjà choisie par l'utilisateur (on ne l'écrase pas).
    if (geminiSuggestion.vibe && geminiSuggestion.vibe !== "autre" && !vibe) {
      onVibeChange(geminiSuggestion.vibe);
    }
    onParsed({
      title: geminiSuggestion.title,
      venue: venueLine || null,
      // Si la card a détecté l'image cassée pendant le preview, on évite
      // de propager l'URL au draft : la sortie créée affichera le hero
      // par défaut au lieu d'une icône cassée.
      image: skipImage ? null : geminiSuggestion.heroImageUrl || null,
      startsAt: geminiSuggestion.startsAt || null,
      ticketUrl: geminiSuggestion.ticketUrl || "",
    });
  }

  function dismissSuggestion() {
    setGeminiSuggestion(null);
    // Refus explicite → on retombe sur le comportement par défaut :
    // erreur visible pour les URL, titre seul pour le texte libre.
    if (looksLikeUrl) {
      setErr("Lien illisible — retape-le ou entre juste le nom de la sortie.");
    } else {
      onTitleOnly(trimmed);
    }
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-10">
      <VibePicker value={vibe} onChange={onVibeChange} />

      <div>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          Un lien,
          <br />
          ou juste un titre.
        </h1>
        <p className="mt-4 text-base text-ink-500">
          {hint ?? "On remplit le reste si on peut, sinon on continue."}
        </p>
      </div>

      <div className="relative">
        <Link2
          size={18}
          className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-400"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder ?? "https://… ou « La Belle et la Bête »"}
          autoCapitalize="sentences"
          spellCheck={false}
          className="h-16 rounded-full border border-ink-300 bg-surface-200 pr-6 pl-12 text-base font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <EventSuggestions
        results={suggestions}
        correctedQuery={correctedQuery}
        originalQuery={trimmed}
        isLoading={suggestionsLoading}
        onPick={(result) => {
          onSuggestionPicked(result.source === "ticketmaster" ? "tm" : "oa");
          const venueLine = [result.venue, result.city].filter(Boolean).join(", ");
          onParsed({
            title: result.title,
            venue: venueLine || null,
            image: result.image,
            startsAt: result.startsAt,
            ticketUrl: result.ticketUrl,
          });
        }}
      />

      {geminiSuggestion && (
        <GeminiSuggestionCard
          data={geminiSuggestion}
          onAccept={acceptSuggestion}
          onDismiss={dismissSuggestion}
        />
      )}

      {pending && pendingMsg === "search" && !geminiSuggestion && (
        // Sur path texte, le bouton annuler doit faire avancer le wizard
        // avec le titre tapé — sinon l'user qui change d'avis se retrouve
        // bloqué sur la step paste sans signal de quoi faire ensuite. Sur
        // path URL, on ne peut pas avancer (l'input est une URL, pas un
        // titre) → on garde le simple abort.
        <GeminiSearchProgress
          onCancel={() => {
            cancelGemini();
            if (!looksLikeUrl && trimmed) {
              onTitleOnly(trimmed);
            }
          }}
          cancelLabel={!looksLikeUrl ? "Continuer sans attendre" : "Annuler la recherche"}
        />
      )}

      {err && <p className="text-sm text-erreur-700">{err}</p>}

      {/* Bouton opt-in IA : apparaît uniquement après un échec parse
          OG/JSON-LD. Style text-link discret (pas un CTA outline) pour
          ne pas concurrencer visuellement le bouton "Continuer"
          principal — c'est un fallback, pas le path nominal. La durée
          (~15 s) reste annoncée pour respecter le contrat. */}
      {geminiOptInUrl && !pending && !geminiSuggestion && (
        <button
          type="button"
          onClick={runGeminiOptIn}
          className="mx-auto inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
        >
          <Sparkles size={14} />
          Chercher pour moi (≈15 s)
        </button>
      )}

      {/* Opt-in IA path texte : symétrique au bouton URL, même style
          text-link discret. Visible quand TM/OA a renvoyé des cards
          mais qu'aucune ne colle. */}
      {!looksLikeUrl && suggestions.length > 0 && !geminiSuggestion && !pending && (
        <button
          type="button"
          onClick={runGeminiOptInText}
          className="mx-auto inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
        >
          <Sparkles size={14} />
          Chercher pour moi (≈15 s)
        </button>
      )}

      {/* Pendant la recherche Gemini, le composant GeminiSearchProgress
          ci-dessus prend le relais avec son bouton Annuler — on cache le
          bouton principal pour ne pas dupliquer le feedback. */}
      {!(pending && pendingMsg === "search") && (
        // Hiérarchie CTA : quand des suggestions Ticketmaster sont
        // visibles, le tap sur une card est le path principal — on
        // downgrade le bouton en outline pour que l'œil aille d'abord
        // aux suggestions (Hick's Law). Si les cards apparaissent ou
        // disparaissent, le bouton bascule sans flicker (transition
        // de couleur seulement). Quand un opt-in IA est proposé sur
        // l'URL collée, on désactive le bouton principal tant que
        // l'URL n'a pas été modifiée — sinon un re-clic relancerait
        // le même parse OG qui vient d'échouer.
        <Button
          type="button"
          size="lg"
          variant={suggestions.length > 0 && !looksLikeUrl ? "outline" : "default"}
          disabled={
            pending ||
            !trimmed ||
            !!geminiSuggestion ||
            (geminiOptInUrl !== null && trimmed === geminiOptInUrl)
          }
          onClick={submit}
          className="h-16 rounded-full text-base font-bold"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Lecture du lien…
            </span>
          ) : looksLikeUrl ? (
            <span className="inline-flex items-center gap-2">
              <Wand2 size={16} />
              Remplir automatiquement
            </span>
          ) : suggestions.length > 0 ? (
            <span className="inline-flex items-center gap-2">
              <ArrowRight size={16} />
              Aucune ne colle, continuer
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ArrowRight size={16} />
              Continuer
            </span>
          )}
        </Button>
      )}
    </section>
  );
}

/**
 * Loading state dédié pour la recherche Gemini : 12-15 s en moyenne,
 * c'est trop long pour un simple spinner. On annonce explicitement la
 * durée, on fait évoluer le message pour montrer qu'il se passe quelque
 * chose, et on offre un bouton Annuler — le user n'est jamais piégé.
 */
function GeminiSearchProgress({
  onCancel,
  cancelLabel = "Annuler la recherche",
}: {
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    // Cycle de messages : 0–3 s → 3–7 s → 7–15 s → >15 s. Les seuils
    // sont calés sur la latence observée du fallback (12-15 s typique,
    // 25 s timeout côté serveur).
    const t1 = setTimeout(() => setPhase(1), 3000);
    const t2 = setTimeout(() => setPhase(2), 7000);
    const t3 = setTimeout(() => setPhase(3), 15000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  const message = [
    "On cherche cet événement…",
    "On consulte les sources officielles…",
    "On rassemble les infos…",
    "Encore quelques secondes…",
  ][phase];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col items-center gap-3 rounded-3xl border border-acid-100 bg-acid-50/40 px-6 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="grid size-12 place-items-center rounded-full bg-acid-100 text-acid-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-ink-700">{message}</p>
        <p className="text-xs text-ink-500">
          Cette étape peut prendre une quinzaine de secondes.
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-1 text-xs font-semibold text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
      >
        {cancelLabel}
      </button>
    </motion.div>
  );
}

function ConfirmPasteStep({
  draft,
  parserHint,
  onTitleChange,
  onVenueChange,
  onImageBroken,
  onImagePick,
  onNext,
}: {
  draft: Draft;
  parserHint: { kind: "waf" | "spa"; siteName: string; suggestion: string } | null;
  onTitleChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onImageBroken: () => void;
  onImagePick: (url: string) => void;
  onNext: () => void;
}) {
  // L'URL OG du parser peut être morte (CDN expiré, S3 signé périmé,
  // 403, etc.). Sans onError on validait silencieusement une sortie au
  // visuel cassé en prod. Le state local évite la course entre le
  // re-render du parent et le repaint de l'<img>.
  const [imageFailed, setImageFailed] = useState(false);
  // Quand l'utilisateur change d'image (via le picker — "Rechercher une
  // autre", "Importer la mienne"…), on remet imageFailed à false pour
  // que la nouvelle URL ait sa chance avant de retomber sur le picker.
  // Pattern documenté React : ajuster un state pendant le render quand
  // une prop change, plutôt qu'un useEffect qui produirait un double
  // render (et qui se fait taper sur les doigts par le compilateur).
  const [trackedUrl, setTrackedUrl] = useState(draft.heroImageUrl);
  if (trackedUrl !== draft.heroImageUrl) {
    setTrackedUrl(draft.heroImageUrl);
    setImageFailed(false);
  }

  const showPicker = !draft.heroImageUrl || imageFailed;

  return (
    <section className="flex flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-acid-600">
          Voilà ce qu&rsquo;on a trouvé
        </p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          Ça colle&nbsp;?
        </h1>
        <p className="mt-3 text-sm text-ink-400">Tape directement dans la carte pour corriger.</p>
      </div>

      {parserHint && (
        <div className="flex flex-col gap-1 rounded-2xl border border-acid-100 bg-acid-50/60 px-4 py-3">
          <p className="text-xs font-bold text-ink-700">
            {parserHint.kind === "waf"
              ? `${parserHint.siteName} bloque le scraping`
              : `${parserHint.siteName} ne partage pas ses infos`}
          </p>
          <p className="text-xs text-ink-500">{parserHint.suggestion}</p>
        </div>
      )}

      <article className="overflow-hidden rounded-3xl border border-ink-300 bg-surface-200 shadow-[var(--shadow-md)]">
        {draft.heroImageUrl && !imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.heroImageUrl}
            alt=""
            onError={() => {
              setImageFailed(true);
              onImageBroken();
            }}
            className="aspect-[16/10] w-full bg-surface-100 object-cover object-top"
          />
        )}
        {showPicker && <MissingImagePicker vibe={draft.vibe} onPick={onImagePick} />}
        <div className="flex flex-col gap-2 p-5">
          <InlineEditable
            value={draft.title}
            onChange={onTitleChange}
            placeholder="Titre à compléter"
            className="text-2xl font-black leading-tight tracking-tight text-ink-700"
            maxLength={200}
            as="textarea"
            rows={2}
          />
          <InlineEditable
            value={draft.venue}
            onChange={onVenueChange}
            placeholder="Ajouter un lieu (facultatif)"
            className="text-base text-ink-500"
            maxLength={200}
          />
        </div>
      </article>

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          disabled={!draft.title.trim()}
          className="h-16 w-full rounded-full text-base font-bold"
        >
          Oui, on continue
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </section>
  );
}

/**
 * Single-line or textarea field styled so it reads as display text until
 * focused. Uncontrolled border appears on focus; placeholder sits in the
 * same rhythm as the resolved text. Used on the confirm-paste card so
 * the title and venue can be corrected inline without leaving the
 * ritual-style card.
 */
function InlineEditable({
  value,
  onChange,
  placeholder,
  className,
  maxLength,
  as = "input",
  rows = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className: string;
  maxLength?: number;
  as?: "input" | "textarea";
  rows?: number;
}) {
  const shared =
    "w-full resize-none bg-transparent outline-none transition-colors placeholder:text-ink-400 focus:ring-0";
  if (as === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`${shared} ${className}`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`${shared} ${className}`}
    />
  );
}

function TitleStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="flex min-h-full flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          Comment ça s&rsquo;appelle ?
        </h1>
      </div>

      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Macbeth à la Comédie-Française"
        maxLength={200}
        className="h-16 rounded-2xl border border-ink-300 bg-surface-200 text-lg font-medium"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onNext();
          }
        }}
      />

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          disabled={!value.trim()}
          onClick={onNext}
          className="h-16 w-full rounded-full text-base font-bold"
        >
          Continuer
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </section>
  );
}

/**
 * Unified "when" step. Progressive-disclosure pattern borrowed from
 * Apple Reminders / Rallly / Lu.ma: the user picks a single date +
 * time like any event, and only if they tap the subtle "Proposer une
 * autre date" row does the step quietly switch into multi-slot mode
 * (which the publish action then translates into vote-mode on the
 * server). The words "sondage" / "vote" never surface — mode is
 * derived from how many slots end up committed.
 *
 * State shape:
 *   - `slots` = committed creneaux (0…8)
 *   - `pendingDate` / `pendingTime` = the picker's current draft,
 *     merged into slots at publish time if still non-null.
 *   - `pickerOpen` = whether the inline picker is visible. Always
 *     true at 0 slots; user-toggled once at least one slot exists.
 */
function WhenStep({
  title,
  slots,
  pendingDate,
  pendingTime,
  deadline,
  onSlotsChange,
  onPendingDateChange,
  onPendingTimeChange,
  onDeadlineChange,
  onNext,
}: {
  title: string;
  slots: DraftSlot[];
  pendingDate: Date | null;
  pendingTime: string | null;
  deadline: Date | null;
  onSlotsChange: (next: DraftSlot[]) => void;
  onPendingDateChange: (date: Date | null) => void;
  onPendingTimeChange: (time: string | null) => void;
  onDeadlineChange: (deadline: Date | null) => void;
  onNext: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(slots.length === 0);

  const canAddMore = slots.length < 8;
  const pickerFilled = pendingDate !== null && pendingTime !== null;
  const canProceed = slots.length >= 1 || pickerFilled;

  // Earliest slot (committed or pending) drives the deadline preview —
  // closing the invitation the moment the first-possible date arrives
  // is what the server auto-computes by default.
  const earliest = useMemo(() => {
    const candidates = slots.map((s) => combineDateAndTime(s.date, s.time));
    if (pendingDate && pendingTime) {
      candidates.push(combineDateAndTime(pendingDate, pendingTime));
    }
    if (candidates.length === 0) {
      return null;
    }
    return candidates.reduce((min, cur) => (cur.getTime() < min.getTime() ? cur : min));
  }, [slots, pendingDate, pendingTime]);

  function commitPending() {
    if (!pendingDate || !pendingTime) {
      return;
    }
    const next: DraftSlot = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: pendingDate,
      time: pendingTime,
    };
    onSlotsChange([...slots, next]);
    onPendingDateChange(null);
    onPendingTimeChange("20:00");
    setPickerOpen(false);
  }

  function cancelPending() {
    onPendingDateChange(null);
    onPendingTimeChange("20:00");
    setPickerOpen(false);
  }

  function removeSlot(id: string) {
    const next = slots.filter((s) => s.id !== id);
    onSlotsChange(next);
    // Back to empty → reopen the picker so the user has a control to
    // land on instead of a blank step with just an "add" button.
    if (next.length === 0) {
      setPickerOpen(true);
    }
  }

  return (
    <section className="flex min-h-full flex-col gap-6 px-6 py-10">
      <div className="flex flex-col items-start">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-acid-600">
          <Calendar size={12} />
          Quand
        </p>
        <WizardContextChip title={title} />
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          C&rsquo;est quand ?
        </h1>
      </div>

      {slots.length > 0 && (
        <ul className="flex flex-col gap-2">
          {slots.map((s) => {
            const combined = combineDateAndTime(s.date, s.time);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-300 bg-surface-200 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                  <CalendarDays size={14} className="text-acid-600" />
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Paris",
                  })
                    .format(combined)
                    .replace(":", "h")}
                </div>
                <button
                  type="button"
                  onClick={() => removeSlot(s.id)}
                  aria-label="Retirer ce créneau"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" className="rotate-45" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && canAddMore && (
        <div className="flex flex-col gap-3 rounded-3xl border border-acid-300 bg-surface-200 p-4">
          <SortieCalendar selected={pendingDate} onSelect={(d) => onPendingDateChange(d)} />
          {pendingDate && (
            <>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ink-400">Heure</p>
              <TimeDrum selected={pendingTime} onSelect={onPendingTimeChange} />
            </>
          )}
          {slots.length > 0 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={cancelPending} className="text-sm">
                Annuler
              </Button>
              <Button
                type="button"
                onClick={commitPending}
                disabled={!pickerFilled}
                className="text-sm"
              >
                Ajouter ce créneau
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Ghost row — the whole point of this step. Appears only once a
          first slot is pickable, so the invitation to propose alternatives
          stays hidden from users who just want a fixed date. */}
      {slots.length === 0 && pickerFilled && canAddMore && (
        <button
          type="button"
          onClick={commitPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-transparent text-sm font-medium text-ink-400 transition-colors motion-safe:active:scale-[0.99] hover:border-acid-300 hover:text-acid-700"
        >
          + Proposer une autre date
        </button>
      )}

      {!pickerOpen && canAddMore && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          className="h-12 w-full rounded-full border-2 border-dashed border-acid-300 text-sm font-bold text-acid-700"
        >
          + Proposer une autre date
        </Button>
      )}

      {!canAddMore && (
        <p className="text-xs text-ink-400">
          Huit créneaux max — retires-en un pour en ajouter un autre.
        </p>
      )}

      {earliest && (
        <DeadlineSection
          startsAt={earliest}
          deadline={deadline}
          onDeadlineChange={onDeadlineChange}
        />
      )}

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          disabled={!canProceed}
          onClick={onNext}
          className="h-16 w-full rounded-full text-base font-bold"
        >
          Ça marche
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </section>
  );
}

/**
 * Deadline section — shown below the time picker once the user has
 * picked date + time. Displays the auto-computed deadline (based on how
 * far out the event is) and lets the user override via offset chips or
 * a full calendar popover. Stored as a Date override in the draft;
 * when null, the server re-computes the default at publish time.
 */
function DeadlineSection({
  startsAt,
  deadline,
  onDeadlineChange,
}: {
  startsAt: Date;
  deadline: Date | null;
  onDeadlineChange: (deadline: Date | null) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const autoOffsetMs = computeDeadlineOffsetMs(startsAt);
  // L'auto-deadline retombe en fin de journée (cf. règle métier
  // "23:59 Paris" enforce côté serveur via `endOfDayInParis`). On
  // applique ici aussi pour que l'UI affiche la même valeur que ce qui
  // sera stocké, sans surprise au reload après save.
  const autoDeadline = endOfDayInParis(new Date(startsAt.getTime() - autoOffsetMs));
  const effective = deadline ?? autoDeadline;
  const isCustom = deadline !== null;

  // `now` is captured once per mount so the presets don't drift as the
  // user lingers on the step. Deadlines are computed comme "fin de la
  // journée à `now + N jours`" — modèle mental simple ("clôture vendredi
  // soir, j'ai 3 jours pour répondre"). Le serveur normalise quoi qu'il
  // arrive via `endOfDayInParis`, mais on l'applique côté client aussi
  // pour rester cohérent avec ce qui s'affiche dans le label.
  const now = useMemo(() => new Date(), []);

  const presets = useMemo(
    () => [
      { label: "Dans 1 jour", days: 1 },
      { label: "Dans 3 jours", days: 3 },
      { label: "Dans 1 semaine", days: 7 },
      { label: "Dans 2 semaines", days: 14 },
    ],
    []
  );

  function presetDeadline(days: number): Date {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    return endOfDayInParis(target);
  }

  // Highlight le preset dont la date cible matche le jour Paris de la
  // deadline courante. Comparaison de jour calendaire (pas d'offset
  // horaire) vu que les deadlines sont toutes fixées à 23:59.
  const activePreset = presets.find(
    (p) => isSameParisDay(presetDeadline(p.days), effective)
  );

  return (
    <div className="rounded-2xl border border-ink-300 bg-surface-200 p-4">
      <div className="flex items-start gap-3">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-acid-600" />
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">
            Dernier jour pour répondre
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink-700">
            {formatDeadline(effective)}
            {!isCustom && (
              <span className="ml-1 text-xs font-medium text-ink-400">
                (auto, {describeOffset(autoOffsetMs)})
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-acid-700 underline-offset-4 hover:underline"
        >
          <Pencil size={12} />
          {editOpen ? "Fermer" : "Changer"}
        </button>
      </div>

      {editOpen && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDeadlineChange(null)}
            aria-pressed={!isCustom}
            className={`inline-flex h-9 items-center rounded-full border-2 px-3 text-xs font-bold transition-colors ${
              !isCustom
                ? "border-acid-600 bg-acid-600 text-surface-50"
                : "border-ink-300 bg-surface-200 text-ink-700 motion-safe:active:scale-95"
            }`}
          >
            Auto
          </button>
          {presets.map((p) => {
            const active = activePreset === p;
            // Hide presets whose deadline lands à/après la date de
            // l'événement — demander de répondre après la sortie n'a
            // pas de sens. Laisse `Auto` + presets valides visibles.
            const proposedDeadline = presetDeadline(p.days);
            if (proposedDeadline.getTime() >= startsAt.getTime()) {
              return null;
            }
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onDeadlineChange(proposedDeadline)}
                aria-pressed={active}
                className={`inline-flex h-9 items-center rounded-full border-2 px-3 text-xs font-bold transition-colors ${
                  active
                    ? "border-acid-600 bg-acid-600 text-surface-50"
                    : "border-ink-300 bg-surface-200 text-ink-700 motion-safe:active:scale-95"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-full border-2 border-dashed border-acid-300 bg-transparent px-3 text-xs font-bold text-acid-600 transition-colors motion-safe:active:scale-95 hover:border-acid-600"
              >
                <CalendarDays size={12} />
                Date précise
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="theme-sortie w-[320px] bg-surface-50 p-4">
              <SortieCalendar
                selected={deadline ?? null}
                onSelect={(d) => {
                  // Toujours fin de journée : pas de second choix
                  // d'heure (cf. règle métier 23:59 enforce serveur).
                  onDeadlineChange(endOfDayInParis(d));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

// Toutes les deadlines tombent à 23:59 Paris (cf. règle métier
// `endOfDayInParis`). Inutile de répéter "23h59" sur chaque card du
// wizard — le hint "(clôture à 23h59)" sous le picker ou la copy
// "Dernier jour pour répondre" suffisent à porter la sémantique.
const deadlineDateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

function formatDeadline(date: Date): string {
  return deadlineDateFmt.format(date);
}

const parisDayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isSameParisDay(a: Date, b: Date): boolean {
  return parisDayKeyFmt.format(a) === parisDayKeyFmt.format(b);
}

function describeOffset(offsetMs: number): string {
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

function VenueStep({
  title,
  value,
  onChange,
  onNext,
  onSkip,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="flex min-h-full flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-start">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-acid-600">
          <MapPin size={12} />
          Le lieu
        </p>
        <WizardContextChip title={title} />
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          Où ça se passe ?
        </h1>
        <p className="mt-3 text-base text-ink-500">Facultatif.</p>
      </div>

      <Input
        autoFocus={!value}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Salle Richelieu · Paris 1er"
        maxLength={200}
        className="h-16 rounded-2xl border border-ink-300 bg-surface-200 text-lg font-medium"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onNext();
          }
        }}
      />

      <div className="mt-auto flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          className="h-16 w-full rounded-full text-base font-bold"
        >
          Continuer
          <ArrowRight size={18} className="ml-2" />
        </Button>
        {!value && (
          <button
            type="button"
            onClick={onSkip}
            className="self-center text-sm text-ink-400 underline-offset-4 hover:text-acid-700 hover:underline"
          >
            Sauter cette étape →
          </button>
        )}
      </div>
    </section>
  );
}

function NameStep({
  title,
  name,
  email,
  onNameChange,
  onEmailChange,
  onNext,
}: {
  title: string;
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onNext: () => void;
}) {
  const [wantEmail, setWantEmail] = useState(Boolean(email));

  return (
    <section className="flex min-h-full flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-start">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-acid-600">Toi</p>
        <WizardContextChip title={title} />
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          On signe comment&nbsp;?
        </h1>
      </div>

      <Input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ton prénom"
        maxLength={100}
        className="h-16 rounded-2xl border border-ink-300 bg-surface-200 text-center text-2xl font-black tracking-tight"
      />

      <label className="flex items-start gap-3 rounded-xl border border-ink-300 bg-surface-200 p-4 text-sm text-ink-500">
        <input
          type="checkbox"
          checked={wantEmail}
          onChange={(e) => {
            setWantEmail(e.target.checked);
            if (!e.target.checked) {
              onEmailChange("");
            }
          }}
          className="mt-0.5 h-4 w-4 accent-acid-600"
        />
        <span className="flex flex-col">
          <span className="font-bold text-ink-700">Me prévenir par email</span>
          <span className="text-xs text-ink-400">
            Quand quelqu&rsquo;un répond. Sinon c&rsquo;est tout bon.
          </span>
        </span>
      </label>
      {wantEmail && (
        <div className="flex flex-col gap-1.5">
          <Input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            type="email"
            placeholder="ton@email.com"
            className="h-14 rounded-xl border border-ink-300 bg-surface-200 text-base"
          />
          {email.length > 0 && !isValidEmail(email) && (
            <p className="text-xs text-erreur-700">Email invalide.</p>
          )}
        </div>
      )}

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          disabled={!name.trim() || (wantEmail && email.length > 0 && !isValidEmail(email))}
          onClick={onNext}
          className="h-16 w-full rounded-full text-base font-bold"
        >
          Récapitulatif
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </section>
  );
}

function CommitStep({
  draft,
  isLoggedIn,
  error,
  onPublish,
}: {
  draft: Draft;
  isLoggedIn: boolean;
  error: string | null;
  onPublish: () => Promise<void>;
}) {
  const dateText = useMemo(() => {
    if (!draft.date || !draft.time) {
      return "";
    }
    const combined = combineDateAndTime(draft.date, draft.time);
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    })
      .format(combined)
      .replace(":", "h");
  }, [draft.date, draft.time]);

  return (
    <section className="flex min-h-full flex-col gap-6 px-6 py-10">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-acid-600">
          <PartyPopper size={12} />
          Prêt
        </p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700">
          On est prêts. Tu confirmes&nbsp;?
        </h1>
      </div>

      <article
        className="relative overflow-hidden rounded-3xl bg-surface-100 shadow-[var(--shadow-velvet)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(199,255,60,0.18) 0%, transparent 45%), radial-gradient(circle at 90% 100%, rgba(255,61,129,0.18) 0%, transparent 45%)",
        }}
      >
        {draft.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.heroImageUrl}
            alt=""
            className="aspect-[16/10] w-full bg-surface-100 object-cover object-top"
          />
        )}
        <div className="relative p-6">
          <div className="pointer-events-none absolute top-0 -left-3 h-6 w-6 rounded-full bg-surface-100" />
          <div className="pointer-events-none absolute top-0 -right-3 h-6 w-6 rounded-full bg-surface-100" />
          <h2 className="text-2xl font-black leading-tight tracking-tight text-ink-700">
            {draft.title}
          </h2>
          <p className="mt-3 text-sm font-semibold text-acid-700">{dateText}</p>
          {draft.venue && <p className="mt-1 text-sm text-ink-500">{draft.venue}</p>}
          {!isLoggedIn && draft.creatorDisplayName && (
            <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-ink-400">
              Organisé par {draft.creatorDisplayName}
            </p>
          )}
        </div>
      </article>

      {error && (
        <p className="rounded-xl border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <SwipeToPublish onConfirm={onPublish} />
        <p className="mt-3 text-center text-xs text-ink-400">
          Les réponses se ferment toutes seules avant la date.
        </p>
      </div>
    </section>
  );
}
