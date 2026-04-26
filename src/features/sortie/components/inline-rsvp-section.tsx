"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import { NoNameSheet, YesDetailSheet, type RsvpResponse } from "./rsvp-sheets";
import { RemoveRsvpButton } from "./remove-rsvp-dialog";

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
 * Compact RSVP picker for the profile page cards. Mirrors the behavior of
 * `RsvpPrompt` (used on the outing page) but scaled down — the card is a
 * secondary surface, so the buttons are shorter and the status chip is
 * inline rather than the full-page chip+"Modifier" layout.
 *
 * Reuses `NoNameSheet` and `YesDetailSheet` from `rsvp-sheets.tsx` so the
 * actual data capture is identical whether the user RSVPs from the outing
 * page or from the profile card.
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

  const knownName = existing?.name ?? loggedInName ?? "";

  async function commitNo(name: string) {
    const fd = new FormData();
    fd.set("shortId", shortId);
    fd.set("response", "no");
    fd.set("displayName", name);
    fd.set("extraAdults", "0");
    fd.set("extraChildren", "0");
    await rsvpAction({}, fd);
    router.refresh();
  }

  async function handleNoTap() {
    if (knownName.trim().length > 0) {
      await commitNo(knownName);
      return;
    }
    setSheetMode("no-name-needed");
  }

  function handleYesTap() {
    setSheetMode("yes");
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

  // Unified `grid-cols-2` layout in both states — no jarring jump when
  // the viewer taps from "not answered" to "answered." Both pre- and
  // post-RSVP show one primary button + one secondary, both 44px for
  // HIG compliance.
  if (existing) {
    const isComing = existing.response !== "no";
    const summary = summariseResponse(
      existing.response,
      existing.extraAdults,
      existing.extraChildren
    );
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleYesTap}
          aria-label={`${summary} — taper pour modifier`}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors motion-safe:active:scale-95 ${
            isComing
              ? "bg-bordeaux-600 text-ivoire-50 hover:bg-bordeaux-700"
              : "bg-encre-700 text-ivoire-50 hover:bg-encre-800"
          }`}
        >
          {isComing ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
          <span className="truncate">{summary}</span>
        </button>
        <RemoveRsvpButton
          shortId={shortId}
          triggerLabel="Retirer ma réponse"
          iconSize={14}
          triggerClassName="flex h-11 items-center justify-center gap-1.5 truncate rounded-full border-2 border-encre-100 px-3 text-sm font-semibold text-encre-700 transition-colors hover:border-encre-700 motion-safe:active:scale-95"
        />
        {sheets}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <CardResponseButton
        icon={<Check size={16} strokeWidth={2.5} />}
        label="J'en suis"
        tone="yes"
        onClick={handleYesTap}
      />
      <CardResponseButton
        icon={<X size={16} strokeWidth={2.5} />}
        label="Je peux pas"
        tone="no"
        onClick={handleNoTap}
      />
      {sheets}
    </div>
  );
}

function CardResponseButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  // Pre-RSVP: les deux boutons restent à poids visuel égal (un "non"
  // intimidé fausse la mesure de présence) MAIS aucun ne porte la
  // couleur "active" — sinon l'œil lit "J'en suis" comme déjà coché et
  // "Je peux pas" comme un CTA blanc agressif sur le thème sombre. On
  // bascule donc sur un style ghost partagé : la distinction passe par
  // la teinte de l'icône (vert acide pour le yes, neutre pour le no).
  const accent = tone === "yes" ? "text-bordeaux-600" : "text-encre-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-encre-200 bg-ivoire-100 px-3 text-sm font-semibold text-encre-700 transition-colors hover:border-encre-300 hover:bg-ivoire-200 motion-safe:active:scale-95"
    >
      <span className={accent}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function summariseResponse(response: RsvpResponse, extraAdults: number, extraChildren: number) {
  if (response === "no") {
    return "Tu ne viens pas";
  }
  const extras = extraAdults + extraChildren;
  const base = response === "handle_own" ? "Tu viens (billet perso)" : "Tu viens";
  return extras === 0 ? base : `${base} +${extras}`;
}
