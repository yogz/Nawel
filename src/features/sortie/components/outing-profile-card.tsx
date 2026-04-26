"use client";

import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { formatOutingDate, formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { InlineRsvpSection } from "./inline-rsvp-section";
import type { RsvpResponse } from "./rsvp-sheets";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  status: string;
  mode: "fixed" | "vote";
  heroImageUrl: string | null;
  confirmedCount: number;
};

type Props = {
  outing: Outing;
  showRsvp: boolean;
  myRsvp: {
    response: RsvpResponse;
    name: string;
    extraAdults: number;
    extraChildren: number;
    email?: string;
  } | null;
  loggedInName?: string | null;
  outingBaseUrl: string;
  isPast: boolean;
};

/**
 * Compact Letterboxd / Apple Music row: 64px thumbnail + metadata
 * stack. When the viewer holds an invite token and the outing is a
 * fixed-date upcoming one, the RSVP controls sit in a bordered
 * block below the navigation row — same card, clear separation
 * between "tap to navigate" and "tap to act."
 *
 * Design refinements (post UX review):
 *   - No chevron. Tapping anywhere on the row navigates — redundant
 *     chevron only competed with the chip row below for attention.
 *   - RSVP state is surfaced as an eyebrow ABOVE the date ("✓ Tu
 *     viens"), so the first fixation on an answered card reads as
 *     "you're going" rather than "here's another outing."
 *   - Divider between the nav row (Link) and the action row
 *     (InlineRsvpSection) — two interaction zones, two visual zones.
 */
export function OutingProfileCard({
  outing,
  showRsvp,
  myRsvp,
  loggedInName,
  outingBaseUrl,
  isPast,
}: Props) {
  const canonical = outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId;
  const href = `/${canonical}`;
  const outingUrl = `${outingBaseUrl}/${canonical}`;

  // v1: inline RSVP is limited to `fixed` outings. Vote-mode requires the
  // full timeslot matrix (too heavy for a card) — fall back to the
  // plain row layout until we design a dedicated voting sheet.
  const canInlineRsvp = showRsvp && !isPast && outing.mode === "fixed";

  const dateLabel = outing.startsAt
    ? isPast
      ? formatOutingDateShort(outing.startsAt)
      : formatOutingDate(outing.startsAt)
    : null;

  const meta = [
    formatVenue(outing.location),
    outing.confirmedCount > 0
      ? `${outing.confirmedCount} confirmé${outing.confirmedCount > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const statusEyebrow =
    myRsvp === null
      ? null
      : myRsvp.response === "no"
        ? { label: "Tu ne viens pas", tone: "muted" as const }
        : myRsvp.response === "handle_own"
          ? { label: "Tu viens · billet perso", tone: "confirmed" as const }
          : { label: "Tu viens", tone: "confirmed" as const };

  // Sortie passée : on dégrade le visuel pour qu'elle se lise comme un
  // souvenir et non comme une action en attente. Opacité légère sur la
  // carte entière + grayscale sur l'image (les couleurs criardes des
  // affiches passées tirent l'œil sans raison). Hover restaure l'état
  // plein pour les rares fois où l'utilisateur veut quand même cliquer
  // (relire les détails, contacter un participant…).
  const pastWrapperClasses = isPast
    ? "opacity-70 transition-[opacity,filter] duration-300 hover:opacity-100 [&_img]:grayscale [&_img]:transition-[filter] [&_img]:duration-300 hover:[&_img]:grayscale-0"
    : "";

  // First letter of the title for the poster-less fallback thumbnail.
  // Same visual vocabulary as the LiveStatusHero empty state — gradient
  // panel with a big typographic initial instead of a dead color swatch.
  const initial = (outing.title.trim().charAt(0) || "·").toLocaleUpperCase("fr");

  const navigationRow = (
    <>
      {outing.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={outing.heroImageUrl}
          alt=""
          className="size-16 shrink-0 rounded-md bg-ivoire-100 object-cover object-top"
        />
      ) : (
        <div
          aria-hidden="true"
          className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, #FF3D81 0%, transparent 50%), radial-gradient(circle at 75% 80%, #C7FF3C 0%, transparent 50%), #1a1a1a",
          }}
        >
          <span
            className="text-2xl font-black leading-none tracking-tight text-encre-50 opacity-50 select-none"
            style={{
              fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
              mixBlendMode: "overlay",
            }}
          >
            {initial}
          </span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {statusEyebrow && (
          <p
            className={`flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
              statusEyebrow.tone === "confirmed" ? "text-bordeaux-600" : "text-encre-400"
            }`}
          >
            {statusEyebrow.tone === "confirmed" ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              <X size={12} strokeWidth={3} />
            )}
            {statusEyebrow.label}
          </p>
        )}
        {dateLabel && (
          <p
            className={`font-mono text-[10.5px] uppercase tracking-[0.18em] ${
              statusEyebrow ? "text-encre-400" : "text-bordeaux-600"
            }`}
          >
            {dateLabel}
          </p>
        )}
        <h3 className="truncate text-[17px] leading-tight font-black tracking-[-0.025em] text-encre-700 group-hover:text-bordeaux-600">
          {outing.title}
        </h3>
        {meta && <p className="truncate text-[13px] text-encre-500">{meta}</p>}
      </div>
    </>
  );

  if (canInlineRsvp) {
    // Chevron dropped per UX review — its "tap to navigate" signal
    // was competing with the chip row's "tap to act" signal. The
    // divider + cobalt status eyebrow carry enough affordance for
    // the Link now. Subtle hover tint on row 1 makes tappability
    // still discoverable.
    return (
      <article
        className={`rounded-xl bg-ivoire-50 p-3 ring-1 ring-encre-700/5 ${pastWrapperClasses}`}
      >
        <Link
          href={href}
          className="group -m-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-encre-700/[0.02]"
        >
          {navigationRow}
        </Link>
        <div className="mt-3 border-t border-encre-700/5 pt-3">
          <InlineRsvpSection
            shortId={outing.shortId}
            outingTitle={outing.title}
            outingUrl={outingUrl}
            outingDate={outing.startsAt}
            existing={myRsvp}
            loggedInName={loggedInName}
          />
        </div>
      </article>
    );
  }

  // Non-RSVP path: the chevron stays here as the only nav affordance,
  // since there are no action chips below competing with it.
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl bg-ivoire-50 p-3 ring-1 ring-encre-700/5 transition-colors hover:ring-or-500 ${pastWrapperClasses}`}
    >
      {navigationRow}
      <ChevronRight
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-encre-300 transition-colors group-hover:text-or-600"
      />
    </Link>
  );
}
