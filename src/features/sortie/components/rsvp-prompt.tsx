"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import { NoNameSheet, YesDetailSheet, type RsvpResponse } from "./rsvp-sheets";
import { RsvpStub } from "./rsvp-stub";
import { RemoveRsvpButton } from "./remove-rsvp-dialog";

type Response = RsvpResponse;

type Props = {
  shortId: string;
  existingResponse?: Response | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
  // Session.user.name for logged-in visitors; used as a fallback identity
  // when they tap "Je peux pas" without any past participant record.
  loggedInName?: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
};

type SheetMode = "idle" | "yes" | "no-name-needed";

/**
 * Two-tier RSVP pattern — replaces the old single-sheet entry point.
 *
 * Layer 1: two huge buttons directly on the outing page ("J'en suis" /
 * "Je peux pas"). No modal, no overhead. Equal visual weight — one of
 * the RSVP-flow experts was explicit that a timid "no" poisons
 * attendance data.
 *
 * Layer 2: opens only when needed. Tapping "J'en suis" opens the detail
 * sheet (name, extras, handle_own, email). Tapping "Je peux pas" either
 * commits instantly (logged-in users or returning anons with a
 * remembered name) or pops a minimal "qui dit non ?" sheet (one field)
 * for first-timers. Fully symmetric: no value is captured twice, no
 * user is asked twice.
 *
 * Post-RSVP state shows as a status chip with "Modifier" affordance.
 */
export function RsvpPrompt({
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
  loggedInName,
  outingTitle,
  outingUrl,
  outingDate,
}: Props) {
  const router = useRouter();
  const [sheetMode, setSheetMode] = useState<SheetMode>("idle");
  const [stub, setStub] = useState<{ name: string } | null>(null);

  const knownName = existingName ?? loggedInName ?? "";

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

  // Current response summary rendered when the user already RSVP'd —
  // same two-button shape as the initial picker so they can switch sides
  // in one tap. The active side is highlighted; the inactive side takes
  // them through the switch flow (commit "no" / open yes-sheet).
  if (existingResponse) {
    const isComing = existingResponse !== "no";
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <PageResponseButton
            icon={<Check size={22} strokeWidth={2.5} />}
            label={
              isComing
                ? summariseResponse(existingResponse, existingExtraAdults, existingExtraChildren)
                : "J'en suis"
            }
            tone="yes"
            active={isComing}
            onClick={handleYesTap}
          />
          <PageResponseButton
            icon={<X size={22} strokeWidth={2.5} />}
            label={isComing ? "Je peux plus" : "Je peux pas"}
            tone="no"
            active={!isComing}
            onClick={handleNoTap}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          {isComing && (
            <button
              type="button"
              onClick={handleYesTap}
              className="inline-flex items-center gap-1 text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
            >
              <Pencil size={12} />
              Changer mes infos
            </button>
          )}
          <RemoveRsvpButton
            shortId={shortId}
            triggerClassName="inline-flex items-center gap-1 text-sm text-encre-400 underline-offset-4 hover:text-destructive hover:underline"
            triggerLabel="Retirer ma réponse"
            iconSize={12}
          />
        </div>

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
          existingResponse={existingResponse}
          existingName={existingName}
          existingExtraAdults={existingExtraAdults}
          existingExtraChildren={existingExtraChildren}
          existingEmail={existingEmail}
          loggedInName={loggedInName}
          outingTitle={outingTitle}
          outingUrl={outingUrl}
          outingDate={outingDate}
          onSuccess={(name, response) => {
            if (response !== "no") {
              setStub({ name: name.split(/\s+/)[0] ?? name });
            }
            setSheetMode("idle");
          }}
        />

        {stub && (
          <RsvpStub
            outingTitle={outingTitle}
            outingUrl={outingUrl}
            date={outingDate}
            userName={stub.name}
            onClose={() => setStub(null)}
          />
        )}
      </>
    );
  }

  // No response yet → the two big buttons.
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <PageResponseButton
          icon={<Check size={22} strokeWidth={2.5} />}
          label="J'en suis"
          tone="yes"
          onClick={handleYesTap}
        />
        <PageResponseButton
          icon={<X size={22} strokeWidth={2.5} />}
          label="Je peux pas"
          tone="no"
          onClick={handleNoTap}
        />
      </div>

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
        existingResponse={existingResponse ?? null}
        existingName={existingName}
        existingExtraAdults={existingExtraAdults}
        existingExtraChildren={existingExtraChildren}
        existingEmail={existingEmail}
        loggedInName={loggedInName}
        outingTitle={outingTitle}
        outingUrl={outingUrl}
        outingDate={outingDate}
        onSuccess={(name, response) => {
          if (response !== "no") {
            setStub({ name: name.split(/\s+/)[0] ?? name });
          }
          setSheetMode("idle");
        }}
      />

      {stub && (
        <RsvpStub
          outingTitle={outingTitle}
          outingUrl={outingUrl}
          date={outingDate}
          userName={stub.name}
          onClose={() => setStub(null)}
        />
      )}
    </>
  );
}

function PageResponseButton({
  icon,
  label,
  tone,
  active = true,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "yes" | "no";
  // `active` drives the "highlighted / muted" style pair. When both
  // buttons are shown post-RSVP, one is active (current response) and
  // the other is muted (the switch-to affordance). When both are shown
  // pre-RSVP the caller passes `active = true` for both and they look
  // equal-weight — deliberately, since discouraging "no" inflates
  // silent non-responses.
  active?: boolean;
  onClick: () => void;
}) {
  const palette = active
    ? tone === "yes"
      ? "bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-lg)]"
      : "bg-encre-700 text-ivoire-50 shadow-[var(--shadow-lg)]"
    : "bg-white text-encre-600 border-2 border-encre-100";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl px-3 text-center text-base font-black leading-tight tracking-tight transition-transform active:scale-95 ${palette}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function summariseResponse(response: Response, extraAdults: number, extraChildren: number): string {
  if (response === "no") {
    return "Tu ne viens pas";
  }
  const extras = extraAdults + extraChildren;
  const base = response === "handle_own" ? "Tu viens (billet perso)" : "Tu viens";
  if (extras === 0) {
    return base;
  }
  return `${base} +${extras}`;
}
