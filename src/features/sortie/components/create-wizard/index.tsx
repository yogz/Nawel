"use client";

import { useMemo, useState } from "react";
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
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createOutingAction } from "@/features/sortie/actions/outing-actions";
import { computeDeadlineOffsetMs } from "@/features/sortie/actions/schemas";
import { SortieCalendar } from "../sortie-calendar";
import { TimeDrum } from "../time-drum";
import { SwipeToPublish } from "../swipe-to-publish";
import { VibePicker } from "../vibe-picker";
import { VIBE_CONFIG, isVibe, type Vibe } from "../../lib/vibe-config";

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

const STEPS_FIXED: Step[] = ["paste", "confirm", "date", "venue", "name", "commit"];
const STEPS_MANUAL: Step[] = ["paste", "title", "date", "venue", "name", "commit"];

function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h ?? 20, m ?? 0, 0, 0);
  return next;
}

function toLocalIsoString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [draft, setDraft] = useState<Draft>({
    title: defaultTitle ?? "",
    venue: "",
    ticketUrl: "",
    heroImageUrl: "",
    vibe: isVibe(vibeKey) ? vibeKey : null,
    date: null,
    time: "20:00",
    slots: [],
    rsvpDeadline: null,
    creatorDisplayName: defaultCreatorName ?? "",
    creatorEmail: "",
  });
  const [pasteFailed, setPasteFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Title-only input (no URL to parse) → nothing to review on the
    // confirm card, skip it. URL flow keeps the confirm step as usual.
    if (draft.title.length > 0 && draft.ticketUrl.length === 0) {
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

    if (allSlots.length === 1) {
      const only = allSlots[0]!;
      const startsAt = combineDateAndTime(only.date, only.time);
      fd.set("mode", "fixed");
      fd.set("startsAt", toLocalIsoString(startsAt));
    } else {
      // Server schema expects a JSON-encoded array of
      // { startsAt, position }. Position preserves the add order.
      const slotsJson = allSlots.map((s, idx) => ({
        startsAt: toLocalIsoString(combineDateAndTime(s.date, s.time)),
        position: idx,
      }));
      fd.set("mode", "vote");
      fd.set("timeslots", JSON.stringify(slotsJson));
    }

    if (draft.rsvpDeadline) {
      fd.set("rsvpDeadline", toLocalIsoString(draft.rsvpDeadline));
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
    const result = await createOutingAction({}, fd);
    // Success = server-side redirect, so we only land here on error.
    if (result?.message) {
      setError(result.message);
      throw new Error(result.message);
    }
    if (result?.errors) {
      // Surface the offending field name alongside the message — a bare
      // "Invalid input" with no context was impossible to debug live.
      const entry = Object.entries(result.errors)[0];
      const firstField = entry?.[0];
      const firstMessage = entry?.[1]?.[0];
      setError(
        firstField && firstMessage
          ? `${firstField}: ${firstMessage}`
          : (firstMessage ?? "Un champ manque.")
      );
      throw new Error("validation");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ivoire-100">
      <WizardHeader progress={progress} onBack={back} />

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
                onVibeChange={(vibe) => setDraft((d) => ({ ...d, vibe }))}
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
                onTitleChange={(title) => setDraft((d) => ({ ...d, title }))}
                onVenueChange={(venue) => setDraft((d) => ({ ...d, venue }))}
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
                slots={draft.slots}
                pendingDate={draft.date}
                pendingTime={draft.time}
                deadline={draft.rsvpDeadline}
                onSlotsChange={(slots) => setDraft((d) => ({ ...d, slots }))}
                onPendingDateChange={(date) => setDraft((d) => ({ ...d, date }))}
                onPendingTimeChange={(time) => setDraft((d) => ({ ...d, time }))}
                onDeadlineChange={(rsvpDeadline) => setDraft((d) => ({ ...d, rsvpDeadline }))}
                onNext={() => advanceFrom("date")}
              />
            )}
            {step === "venue" && (
              <VenueStep
                value={draft.venue}
                onChange={(venue) => setDraft((d) => ({ ...d, venue }))}
                onNext={() => advanceFrom("venue")}
                onSkip={() => advanceFrom("venue")}
              />
            )}
            {step === "name" && (
              <NameStep
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
      className="relative flex shrink-0 items-center border-b border-encre-100 px-4 pb-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Retour"
        className="grid size-10 place-items-center rounded-full text-encre-500 transition-colors hover:bg-ivoire-200 hover:text-encre-700"
      >
        <ArrowLeft size={20} />
      </button>
      <span className="ml-3 text-xs font-black uppercase tracking-[0.18em] text-encre-400">
        Nouvelle sortie
      </span>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-bordeaux-100">
        <div
          className="h-full bg-bordeaux-600 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}

function PasteStep({
  vibe,
  onVibeChange,
  onParsed,
  onTitleOnly,
}: {
  vibe: Vibe | null;
  onVibeChange: (next: Vibe | null) => void;
  onParsed: (data: {
    title: string | null;
    venue: string | null;
    image: string | null;
    startsAt: string | null;
    ticketUrl: string;
  }) => void;
  onTitleOnly: (title: string) => void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  async function submit() {
    if (!trimmed) {
      return;
    }
    if (looksLikeUrl) {
      setErr(null);
      setPending(true);
      try {
        const res = await fetch("/api/sortie/parse-ticket-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        if (!res.ok) {
          throw new Error("fail");
        }
        const data = await res.json();
        onParsed(data);
      } catch {
        setErr("Lien illisible — retape-le ou entre juste le nom de la sortie.");
      } finally {
        setPending(false);
      }
      return;
    }
    // Plain text: use it as the outing title and skip straight to
    // the date step — no poster to review on the confirm card.
    onTitleOnly(trimmed);
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-10">
      <VibePicker value={vibe} onChange={onVibeChange} />

      <div>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          Un lien,
          <br />
          ou juste un titre.
        </h1>
        <p className="mt-4 text-base text-encre-500">
          {hint ?? "On remplit le reste si on peut, sinon on continue."}
        </p>
      </div>

      <div className="relative">
        <Link2
          size={18}
          className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-encre-300"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? "https://… ou « La Belle et la Bête »"}
          autoCapitalize="sentences"
          spellCheck={false}
          className="h-16 rounded-full border-2 border-encre-100 bg-white pr-6 pl-12 text-base font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      {err && <p className="text-sm text-erreur-700">{err}</p>}

      <Button
        type="button"
        size="lg"
        disabled={pending || !trimmed}
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
        ) : (
          <span className="inline-flex items-center gap-2">
            <ArrowRight size={16} />
            Continuer
          </span>
        )}
      </Button>
    </section>
  );
}

function ConfirmPasteStep({
  draft,
  onTitleChange,
  onVenueChange,
  onNext,
}: {
  draft: Draft;
  onTitleChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="flex flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
          Voilà ce qu&rsquo;on a trouvé
        </p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          Ça colle&nbsp;?
        </h1>
        <p className="mt-3 text-sm text-encre-400">Tape directement dans la carte pour corriger.</p>
      </div>

      <article className="overflow-hidden rounded-3xl border border-encre-100 bg-white shadow-[var(--shadow-md)]">
        {draft.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.heroImageUrl}
            alt=""
            className="aspect-[16/10] w-full bg-ivoire-100 object-cover object-top"
          />
        )}
        <div className="flex flex-col gap-2 p-5">
          <InlineEditable
            value={draft.title}
            onChange={onTitleChange}
            placeholder="Titre à compléter"
            className="text-2xl font-black leading-tight tracking-tight text-encre-700"
            maxLength={200}
            as="textarea"
            rows={2}
          />
          <InlineEditable
            value={draft.venue}
            onChange={onVenueChange}
            placeholder="Ajouter un lieu (facultatif)"
            className="text-base text-encre-500"
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
    "w-full resize-none bg-transparent outline-none transition-colors placeholder:text-encre-300 focus:ring-0";
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
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          Comment ça s&rsquo;appelle ?
        </h1>
      </div>

      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Macbeth à la Comédie-Française"
        maxLength={200}
        className="h-16 rounded-2xl border-2 border-encre-100 bg-white text-lg font-medium"
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
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
          <Calendar size={12} />
          Quand
        </p>
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
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
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-encre-100 bg-white p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-encre-700">
                  <CalendarDays size={14} className="text-bordeaux-600" />
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
                  className="grid size-8 shrink-0 place-items-center rounded-full text-encre-400 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" className="rotate-45" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && canAddMore && (
        <div className="flex flex-col gap-3 rounded-3xl border-2 border-bordeaux-100 bg-white p-4">
          <SortieCalendar selected={pendingDate} onSelect={(d) => onPendingDateChange(d)} />
          {pendingDate && (
            <>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-encre-400">Heure</p>
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-encre-200 bg-transparent text-sm font-medium text-encre-400 transition-colors motion-safe:active:scale-[0.99] hover:border-bordeaux-300 hover:text-bordeaux-700"
        >
          + Proposer une autre date
        </button>
      )}

      {!pickerOpen && canAddMore && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          className="h-12 w-full rounded-full border-2 border-dashed border-bordeaux-300 text-sm font-bold text-bordeaux-700"
        >
          + Proposer une autre date
        </Button>
      )}

      {!canAddMore && (
        <p className="text-xs text-encre-400">
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
  const autoDeadline = new Date(startsAt.getTime() - autoOffsetMs);
  const effective = deadline ?? autoDeadline;
  const isCustom = deadline !== null;

  // `now` is captured once per mount so the presets don't drift as the
  // user lingers on the step. Deadlines are computed as `now + offset`
  // (days after the invitation is published), not `event - offset` —
  // easier mental model for the creator ("I want answers within a week
  // of sending the link") than "I want to close 2 weeks before".
  const now = useMemo(() => new Date(), []);

  const presets = useMemo(
    () => [
      { label: "24h après", offsetMs: 24 * 60 * 60 * 1000 },
      { label: "3 jours après", offsetMs: 3 * 24 * 60 * 60 * 1000 },
      { label: "1 semaine après", offsetMs: 7 * 24 * 60 * 60 * 1000 },
      { label: "2 semaines après", offsetMs: 14 * 24 * 60 * 60 * 1000 },
    ],
    []
  );

  // Highlight the preset that matches the current deadline. Match is
  // computed against `now + offset`, not `event - offset`, so the
  // chip lighting is consistent with the new semantics. 1h tolerance
  // to cover second-level drift between mount and render.
  const currentOffsetFromNowMs = effective.getTime() - now.getTime();
  const activePreset = presets.find(
    (p) => Math.abs(p.offsetMs - currentOffsetFromNowMs) < 60 * 60 * 1000
  );

  return (
    <div className="rounded-2xl border-2 border-encre-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-bordeaux-600" />
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-encre-400">
            Fermeture des réponses
          </p>
          <p className="mt-0.5 text-sm font-semibold text-encre-700">
            {formatDeadline(effective)}
            {!isCustom && (
              <span className="ml-1 text-xs font-medium text-encre-400">
                (auto, {describeOffset(autoOffsetMs)})
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-bordeaux-700 underline-offset-4 hover:underline"
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
                ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                : "border-encre-100 bg-white text-encre-700 motion-safe:active:scale-95"
            }`}
          >
            Auto
          </button>
          {presets.map((p) => {
            const active = activePreset === p;
            // Hide presets whose "now + offset" lands after the event —
            // asking people to reply past the date of the sortie doesn't
            // make sense. Leaves `Auto` + valid ones visible.
            const proposedDeadline = new Date(now.getTime() + p.offsetMs);
            const wouldExceedEvent = proposedDeadline.getTime() >= startsAt.getTime();
            if (wouldExceedEvent) {
              return null;
            }
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onDeadlineChange(new Date(now.getTime() + p.offsetMs))}
                aria-pressed={active}
                className={`inline-flex h-9 items-center rounded-full border-2 px-3 text-xs font-bold transition-colors ${
                  active
                    ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                    : "border-encre-100 bg-white text-encre-700 motion-safe:active:scale-95"
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
                className="inline-flex h-9 items-center gap-1 rounded-full border-2 border-dashed border-bordeaux-300 bg-transparent px-3 text-xs font-bold text-bordeaux-600 transition-colors motion-safe:active:scale-95 hover:border-bordeaux-600"
              >
                <CalendarDays size={12} />
                Date précise
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="theme-sortie w-[320px] bg-ivoire-50 p-4">
              <SortieCalendar
                selected={deadline ?? null}
                onSelect={(d) => {
                  // Copy the auto-deadline's time so the user only has
                  // to pick a date, not also a time.
                  const next = new Date(d);
                  next.setHours(autoDeadline.getHours(), autoDeadline.getMinutes(), 0, 0);
                  onDeadlineChange(next);
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

function formatDeadline(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  })
    .format(date)
    .replace(":", "h");
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
  value,
  onChange,
  onNext,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="flex min-h-full flex-col gap-8 px-6 py-10">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
          <MapPin size={12} />
          Le lieu
        </p>
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          Où ça se passe ?
        </h1>
        <p className="mt-3 text-base text-encre-500">Facultatif.</p>
      </div>

      <Input
        autoFocus={!value}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Salle Richelieu · Paris 1er"
        maxLength={200}
        className="h-16 rounded-2xl border-2 border-encre-100 bg-white text-lg font-medium"
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
            className="self-center text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
          >
            Sauter cette étape →
          </button>
        )}
      </div>
    </section>
  );
}

function NameStep({
  name,
  email,
  onNameChange,
  onEmailChange,
  onNext,
}: {
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onNext: () => void;
}) {
  const [wantEmail, setWantEmail] = useState(Boolean(email));

  return (
    <section className="flex min-h-full flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">Toi</p>
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          On signe comment&nbsp;?
        </h1>
      </div>

      <Input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ton prénom"
        maxLength={100}
        className="h-16 rounded-2xl border-2 border-encre-100 bg-white text-center text-2xl font-black tracking-tight"
      />

      <label className="flex items-start gap-3 rounded-xl border border-encre-100 bg-white p-4 text-sm text-encre-500">
        <input
          type="checkbox"
          checked={wantEmail}
          onChange={(e) => {
            setWantEmail(e.target.checked);
            if (!e.target.checked) {
              onEmailChange("");
            }
          }}
          className="mt-0.5 h-4 w-4 accent-bordeaux-600"
        />
        <span className="flex flex-col">
          <span className="font-bold text-encre-700">Me prévenir par email</span>
          <span className="text-xs text-encre-400">
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
            className="h-14 rounded-xl border-2 border-encre-100 bg-white text-base"
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
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
          <PartyPopper size={12} />
          Prêt
        </p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          On est prêts. Tu confirmes&nbsp;?
        </h1>
      </div>

      <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFE1D7] via-[#FAF7F2] to-[#D7E0FF] shadow-[var(--shadow-velvet)]">
        {draft.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.heroImageUrl}
            alt=""
            className="aspect-[16/10] w-full bg-ivoire-100 object-cover object-top"
          />
        )}
        <div className="relative p-6">
          <div className="pointer-events-none absolute top-0 -left-3 h-6 w-6 rounded-full bg-ivoire-100" />
          <div className="pointer-events-none absolute top-0 -right-3 h-6 w-6 rounded-full bg-ivoire-100" />
          <h2 className="text-2xl font-black leading-tight tracking-tight text-encre-700">
            {draft.title}
          </h2>
          <p className="mt-3 text-sm font-semibold text-bordeaux-700">{dateText}</p>
          {draft.venue && <p className="mt-1 text-sm text-encre-500">{draft.venue}</p>}
          {!isLoggedIn && draft.creatorDisplayName && (
            <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-encre-400">
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
        <p className="mt-3 text-center text-xs text-encre-400">
          Les réponses se ferment toutes seules avant la date.
        </p>
      </div>
    </section>
  );
}
