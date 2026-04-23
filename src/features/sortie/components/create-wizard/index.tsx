"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Link2,
  Loader2,
  MapPin,
  PartyPopper,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOutingAction } from "@/features/sortie/actions/outing-actions";
import { DayStrip } from "../day-strip";
import { TimeDrum } from "../time-drum";
import { SwipeToPublish } from "../swipe-to-publish";

type Step = "paste" | "title" | "confirm" | "date" | "venue" | "name" | "commit";

type Draft = {
  title: string;
  venue: string;
  ticketUrl: string;
  heroImageUrl: string;
  date: Date | null;
  time: string | null;
  creatorDisplayName: string;
  creatorEmail: string;
};

type Props = {
  isLoggedIn: boolean;
  defaultCreatorName?: string;
  vibeKey: string | null;
  pasterPlaceholder?: string;
  pasterHint?: string;
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

/**
 * Dapp-style create wizard. Replaces the long scroll form at /nouvelle
 * with full-screen step cards, big tap targets, gesture-first publish.
 * State-machine is intentionally simple — each step pushes a fixed
 * "next" step (computed by `stepsFor` based on prior inputs). The URL
 * stays on /nouvelle the whole time; back-button exits the flow.
 *
 * Vote-mode (sondage de dates) is intentionally not here — it's
 * preserved at /nouvelle/avance. The 80/20 says fixed mode is the
 * overwhelming default, and every mode toggle in the wizard would be a
 * form-feel regression.
 */
export function CreateWizard({
  isLoggedIn,
  defaultCreatorName,
  vibeKey,
  pasterPlaceholder,
  pasterHint,
  defaultTitle,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [draft, setDraft] = useState<Draft>({
    title: defaultTitle ?? "",
    venue: "",
    ticketUrl: "",
    heroImageUrl: "",
    date: null,
    time: "20:00",
    creatorDisplayName: defaultCreatorName ?? "",
    creatorEmail: "",
  });
  const [pasteFailed, setPasteFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the paste step succeeded we show a confirm screen; otherwise we
  // skip straight to manual title entry. Tracked separately so the back
  // button can revisit the right previous step.
  const steps = useMemo<Step[]>(() => {
    const usePasteBranch = (draft.title.length > 0 || draft.ticketUrl.length > 0) && !pasteFailed;
    return usePasteBranch ? STEPS_FIXED : STEPS_MANUAL;
  }, [draft.title, draft.ticketUrl, pasteFailed]);

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
    if (!draft.date || !draft.time) {
      setError("Choisis une date et une heure.");
      return;
    }
    const startsAt = combineDateAndTime(draft.date, draft.time);
    const fd = new FormData();
    fd.set("title", draft.title);
    fd.set("mode", "fixed");
    fd.set("startsAt", toLocalIsoString(startsAt));
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
      if (draft.creatorEmail) {
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
                placeholder={pasterPlaceholder}
                hint={pasterHint}
                vibeKey={vibeKey}
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
                onManual={() => {
                  setPasteFailed(true);
                  goToStep("title");
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
              <DateStep
                date={draft.date}
                time={draft.time}
                onDateChange={(date) => setDraft((d) => ({ ...d, date }))}
                onTimeChange={(time) => setDraft((d) => ({ ...d, time }))}
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
            {step === "name" && !isLoggedIn && (
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
            {step === "name" &&
              isLoggedIn &&
              (() => {
                setStep("commit");
                return null;
              })()}
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
  placeholder,
  hint,
  vibeKey,
  onParsed,
  onManual,
}: {
  placeholder?: string;
  hint?: string;
  vibeKey: string | null;
  onParsed: (data: {
    title: string | null;
    venue: string | null;
    image: string | null;
    startsAt: string | null;
    ticketUrl: string;
  }) => void;
  onManual: () => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function parse() {
    if (!url.trim()) {
      return;
    }
    setErr(null);
    setPending(true);
    try {
      const res = await fetch("/api/sortie/parse-ticket-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        throw new Error("fail");
      }
      const data = await res.json();
      onParsed(data);
    } catch {
      setErr("Lien illisible — tu peux le saisir à la main.");
    } finally {
      setPending(false);
    }
  }

  const vibeHint = vibeKey
    ? `Pour ta ${vibeKey === "theatre" ? "pièce" : vibeKey === "opera" ? "soirée opéra" : vibeKey === "concert" ? "soirée concert" : vibeKey === "cine" ? "séance ciné" : vibeKey === "expo" ? "visite d'expo" : "sortie"}`
    : null;

  return (
    <section className="flex flex-col gap-8 px-6 py-10">
      <div>
        {vibeHint && (
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
            {vibeHint}
          </p>
        )}
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          Colle le lien
          <br />
          de la billetterie.
        </h1>
        <p className="mt-4 text-base text-encre-500">{hint ?? "On remplit le reste pour toi."}</p>
      </div>

      <div className="relative">
        <Link2
          size={18}
          className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-encre-300"
        />
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder ?? "https://…"}
          className="h-16 rounded-full border-2 border-encre-100 bg-white pr-6 pl-12 text-base font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              parse();
            }
          }}
        />
      </div>

      {err && <p className="text-sm text-erreur-700">{err}</p>}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          disabled={pending || !url.trim()}
          onClick={parse}
          className="h-16 rounded-full text-base font-bold"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Lecture du lien…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Wand2 size={16} />
              Remplir automatiquement
            </span>
          )}
        </Button>
        <button
          type="button"
          onClick={onManual}
          className="self-center text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
        >
          Pas de lien, je saisis à la main →
        </button>
      </div>
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
          On a trouvé ça
        </p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          C&rsquo;est bien ça ?
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

function DateStep({
  date,
  time,
  onDateChange,
  onTimeChange,
  onNext,
}: {
  date: Date | null;
  time: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  onNext: () => void;
}) {
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

      <DayStrip selected={date} onSelect={onDateChange} />

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-encre-400">Heure</p>
        <TimeDrum selected={time} onSelect={onTimeChange} />
      </div>

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          disabled={!date || !time}
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
        <p className="text-xs font-black uppercase tracking-[0.18em] text-bordeaux-600">
          Tu signes
        </p>
        <h1 className="mt-2 text-5xl leading-[0.95] font-black tracking-[-0.03em] text-encre-700">
          C&rsquo;est toi qui organise.
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
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          type="email"
          placeholder="ton@email.com"
          className="h-14 rounded-xl border-2 border-encre-100 bg-white text-base"
        />
      )}

      <div className="mt-auto">
        <Button
          type="button"
          size="lg"
          disabled={!name.trim()}
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
          Tu signes et on publie.
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
          Les réponses se fermeront automatiquement avant la date.
        </p>
      </div>
    </section>
  );
}

// Unused in this file but exported so the parent page can show the link
// to the advanced form where vote mode still lives.
export function AdvancedModeLink({ vibe }: { vibe: string | null }) {
  return (
    <Link
      href={vibe ? `/nouvelle/avance?vibe=${vibe}` : "/nouvelle/avance"}
      className="text-xs text-encre-300 underline-offset-4 hover:text-bordeaux-700 hover:underline"
    >
      Un sondage avec plusieurs dates →
    </Link>
  );
}
