"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import { readAnonPrefs, writeAnonPrefs } from "@/features/sortie/lib/anon-rsvp-prefs";
import { NoNameSheet, YesDetailSheet, type RsvpResponse } from "./rsvp-sheets";

type Props = {
  shortId: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
  existing: {
    response: RsvpResponse;
    name: string;
    extraAdults: number;
    extraChildren: number;
    email?: string;
  } | null;
  loggedInName?: string | null;
};

type SheetMode = "idle" | "yes" | "no-name-needed";

/**
 * Compact RSVP picker pour les cards profil. Pattern Material 3
 * segmented à 2 options après review UX/graphic/copy :
 *
 *   - Labels en 1ère personne : "Je viens" / "Je passe" / "Je retire"
 *     (cohérent avec les sticky CTAs home/page sortie ; "Tu viens" en
 *     bouton créait une ambiguïté grammaticale "app me parle" vs
 *     "j'active mon engagement").
 *   - Sélectionné = filled. "Je viens" filled = acid green, "Je passe"
 *     filled = ghost neutre encre-200 (PAS hot pink — le rose est
 *     déjà overloaded sur les signaux positifs countdown urgent /
 *     best timeslot, l'utiliser pour "refus" casserait la grammaire
 *     visuelle Acid Cabinet).
 *   - Tap sur l'option non-sélectionnée → bascule directe + undo
 *     toast 5s (pattern Gmail/Linear pour rattraper les mis-tap).
 *   - "Je retire" = link tertiaire en sentence-case underline
 *     (PAS un bouton 50% width : c'est une action rare et destructive).
 *   - Link "Déjà ton billet ? →" visible uniquement post-yes, mène à
 *     la page sortie où le `handle_own` complet est dispo.
 */
export function InlineRsvpSection({
  shortId,
  outingTitle,
  outingUrl,
  outingDate,
  existing,
  loggedInName,
}: Props) {
  const router = useRouter();
  const [sheetMode, setSheetMode] = useState<SheetMode>("idle");
  // Suivi de la dernière réponse pour permettre l'undo : quand l'user
  // bascule yes → no, on stocke "yes" pour pouvoir restaurer si besoin.
  const [pending, setPending] = useState(false);

  // Pour les anonymes : si pas d'`existing` sur cette sortie et pas
  // de session loguée, on tombe sur les prefs localStorage (saisie
  // sur une autre sortie). Permet le commit direct yes/no en 1 tap
  // sans ouvrir la sheet, même pour un user qui n'a jamais répondu
  // à CETTE sortie en particulier.
  const prefs = readAnonPrefs();
  const knownName = existing?.name ?? loggedInName ?? prefs?.name ?? "";
  const currentResponse: RsvpResponse | null = existing?.response ?? null;
  const isYes = currentResponse !== null && currentResponse !== "no";
  const isNo = currentResponse === "no";

  async function commitResponse(response: "yes" | "no", name: string) {
    // Quand on commit en direct depuis la card (path 1-tap sans
    // sheet), on reprend les extras/email connus pour ne pas les
    // écraser. Pour un anon sans `existing`, on hydrate depuis les
    // prefs localStorage (saisis sur une autre sortie).
    const extraAdults = existing?.extraAdults ?? prefs?.extraAdults ?? 0;
    const extraChildren = existing?.extraChildren ?? prefs?.extraChildren ?? 0;
    const email = existing?.email ?? prefs?.email ?? "";

    const fd = new FormData();
    fd.set("shortId", shortId);
    fd.set("response", response);
    fd.set("displayName", name);
    fd.set("extraAdults", String(extraAdults));
    fd.set("extraChildren", String(extraChildren));
    if (email) {
      fd.set("email", email);
    }
    await rsvpAction({}, fd);

    // Met à jour les prefs avec ce qu'on vient d'envoyer (le name
    // surtout — l'email/extras viennent déjà des prefs ou d'existing).
    writeAnonPrefs({ name });

    router.refresh();
  }

  async function handleYesTap() {
    if (isYes) {
      // Déjà yes — on ouvre la sheet de détail pour ajuster
      // (extraAdults, handle_own, etc.). Pas de no-op silencieux.
      setSheetMode("yes");
      return;
    }
    if (knownName.trim().length === 0) {
      // Pas de nom connu → on doit ouvrir la sheet pour le saisir.
      setSheetMode("yes");
      return;
    }
    // Bascule directe no → yes avec undo toast.
    const previousResponse = currentResponse;
    setPending(true);
    try {
      await commitResponse("yes", knownName);
      if (previousResponse === "no") {
        toast.success("Tu viens.", {
          duration: 5000,
          action: {
            label: "Annuler",
            onClick: () => {
              void commitResponse("no", knownName);
            },
          },
        });
      }
    } finally {
      setPending(false);
    }
  }

  async function handleNoTap() {
    if (isNo) {
      // Déjà no — tap pour annuler/retirer ? On garde l'état tel
      // quel pour ne pas surprendre. L'utilisateur peut "Je retire"
      // s'il veut effacer.
      return;
    }
    if (knownName.trim().length === 0) {
      setSheetMode("no-name-needed");
      return;
    }
    // À ce point currentResponse est forcément "yes" | "handle_own"
    // (le `if (isNo) return` au-dessus exclut "no") OU null (pas
    // répondu). Si null → pas d'undo à proposer.
    const wasYes = currentResponse !== null;
    setPending(true);
    try {
      await commitResponse("no", knownName);
      if (wasYes) {
        toast.success("Tu passes.", {
          duration: 5000,
          action: {
            label: "Annuler",
            onClick: () => {
              void commitResponse("yes", knownName);
            },
          },
        });
      }
    } finally {
      setPending(false);
    }
  }

  const sheets = (
    <>
      <NoNameSheet
        open={sheetMode === "no-name-needed"}
        onOpenChange={(open) => setSheetMode(open ? "no-name-needed" : "idle")}
        shortId={shortId}
        onDone={() => setSheetMode("idle")}
      />
      <YesDetailSheet
        open={sheetMode === "yes"}
        onOpenChange={(open) => setSheetMode(open ? "yes" : "idle")}
        shortId={shortId}
        existingResponse={existing?.response ?? null}
        existingName={existing?.name}
        existingExtraAdults={existing?.extraAdults}
        existingExtraChildren={existing?.extraChildren}
        existingEmail={existing?.email}
        loggedInName={loggedInName ?? undefined}
        outingTitle={outingTitle}
        outingUrl={outingUrl}
        outingDate={outingDate}
        onSuccess={() => setSheetMode("idle")}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <SegmentedButton
          icon={<Check size={14} strokeWidth={2.6} />}
          label="Je viens"
          selected={isYes}
          tone="yes"
          disabled={pending}
          onClick={handleYesTap}
        />
        <SegmentedButton
          icon={<X size={14} strokeWidth={2.6} />}
          label="Je passe"
          selected={isNo}
          tone="no"
          disabled={pending}
          onClick={handleNoTap}
        />
      </div>

      {/* Plus de lien "Je retire" : il faisait juste un commit "no"
          (= la même action que tap `Je passe`) avec un toast
          différent. Doublon retiré pour alléger la card — l'undo
          snackbar 5s sur les bascules yes ↔ no rattrape déjà les
          erreurs de tap, et `Je passe` est accessible en 1 tap. */}

      {sheets}
    </div>
  );
}

function SegmentedButton({
  icon,
  label,
  selected,
  tone,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  tone: "yes" | "no";
  disabled: boolean;
  onClick: () => void;
}) {
  // Pattern segmented Material 3 : sélectionné = filled, non-sélectionné
  // = outlined. Pour "yes" filled : acid green sur texte noir (lisible
  // AAA). Pour "no" filled : ghost encre-200 + texte clair plutôt
  // qu'hot pink (cf. review graphic designer — le rose est réservé aux
  // signaux positifs countdown/best, le réutiliser pour "refus"
  // casserait la grammaire visuelle).
  const cls = selected
    ? tone === "yes"
      ? "bg-bordeaux-600 text-ivoire-50 hover:bg-bordeaux-700 border-bordeaux-600"
      : "bg-ivoire-200 text-encre-700 hover:bg-ivoire-300 border-ivoire-200"
    : "bg-ivoire-100 text-encre-700 hover:border-encre-300 hover:bg-ivoire-200 border-encre-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      <span className={selected && tone === "yes" ? "text-ivoire-50" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
