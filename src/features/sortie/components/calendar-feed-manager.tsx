"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, Copy, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  activateCalendarFeedAction,
  rotateCalendarFeedAction,
} from "@/features/sortie/actions/calendar-feed-actions";

type Props = {
  /** Token déjà généré côté serveur — null si l'utilisateur n'a
   *  pas encore activé son flux. */
  initialToken: string | null;
  /** Origin sortie (sortie.colist.fr ou sortie.localhost en dev). */
  origin: string;
};

/**
 * Section "Mon agenda" sur /moi : permet à l'utilisateur d'activer
 * son flux iCal personnel et de copier l'URL pour la coller dans
 * Apple Calendar / Google Calendar / Outlook.
 *
 * Deux états :
 *   - inactif : 1 bouton "Activer mon agenda"
 *   - actif : URL copiable + bouton "Régénérer le lien" (rare,
 *     utile en cas de leak)
 */
export function CalendarFeedManager({ initialToken, origin }: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, startTransition] = useTransition();
  const [justCopied, setJustCopied] = useState(false);

  function handleActivate() {
    startTransition(async () => {
      const res = await activateCalendarFeedAction();
      if (!res.ok || !res.token) {
        toast.error(res.message ?? "Échec — réessaie.");
        return;
      }
      setToken(res.token);
    });
  }

  function handleRotate() {
    if (!window.confirm("Régénérer ton lien ? L'ancien arrête de fonctionner immédiatement.")) {
      return;
    }
    startTransition(async () => {
      const res = await rotateCalendarFeedAction();
      if (!res.ok || !res.token) {
        toast.error(res.message ?? "Échec — réessaie.");
        return;
      }
      setToken(res.token);
      toast.success("Nouveau lien généré.");
    });
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-surface-400 bg-surface-100 p-5">
        <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600">
          <Calendar size={12} strokeWidth={2.4} />─ mon agenda ─
        </div>
        <h3
          className="mb-2 text-[20px] leading-[1.1] font-black tracking-[-0.025em] text-ink-700"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Synchronise tes RSVP
          <br />
          avec ton agenda.
        </h3>
        <p className="mb-4 text-[14px] leading-[1.5] text-ink-500">
          Apple Calendar, Google Calendar, Outlook — toutes tes sorties confirmées apparaissent
          automatiquement, mises à jour en temps quasi-réel.
        </p>
        <button
          type="button"
          onClick={handleActivate}
          disabled={pending}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-acid-600 px-5 text-sm font-bold text-ink-50 transition-colors duration-300 hover:bg-acid-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Activation…" : "Activer mon agenda"}
        </button>
      </div>
    );
  }

  // URL `webcal://` ouvre direct le prompt de subscription sur iOS /
  // macOS / Outlook desktop. Pour Google Calendar, l'utilisateur doit
  // copier l'URL `https://` et la coller dans "Ajouter par URL".
  const httpsUrl = `${origin}/calendar/${token}.ics`;
  const webcalUrl = `webcal://${origin.replace(/^https?:\/\//, "")}/calendar/${token}.ics`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1800);
      toast.success("Lien copié.");
    } catch {
      window.prompt("Copie ce lien :", httpsUrl);
    }
  }

  return (
    <div className="rounded-2xl border border-surface-400 bg-surface-100 p-5">
      <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600">
        <Calendar size={12} strokeWidth={2.4} />─ mon agenda ─
      </div>

      <p className="mb-4 text-[14px] leading-[1.5] text-ink-500">
        Tes sorties RSVP s&rsquo;affichent automatiquement dans ton agenda. Ajoute le lien
        ci-dessous à Apple Calendar, Google Calendar ou Outlook.
      </p>

      <div className="mb-3 flex flex-col gap-2">
        <a
          href={webcalUrl}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-acid-600 px-4 text-sm font-bold text-ink-50 transition-colors duration-300 hover:bg-acid-700"
        >
          Ajouter à mon agenda
        </a>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          ↳ ouvre le prompt sur iOS / macOS. Sur Google Calendar, copie le lien et colle-le dans{" "}
          <span className="text-ink-600">Autres calendriers → À partir d&rsquo;une URL</span>.
        </p>
      </div>

      <div className="mb-4 flex items-stretch gap-2">
        <input
          readOnly
          value={httpsUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 truncate rounded-lg border border-surface-400 bg-surface-50 px-3 font-mono text-[11px] text-ink-500"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copier le lien"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-surface-400 bg-surface-50 text-ink-700 transition-colors hover:border-ink-300 hover:bg-surface-200"
        >
          {justCopied ? <Check size={16} className="text-acid-600" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="border-t border-surface-400 pt-3">
        <button
          type="button"
          onClick={handleRotate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400 underline-offset-4 transition-colors hover:text-hot-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCw size={11} strokeWidth={2.4} />
          Régénérer le lien
        </button>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          ↳ utile si tu as partagé le lien par erreur. L&rsquo;ancien arrête de marcher
          immédiatement.
        </p>
      </div>
    </div>
  );
}
