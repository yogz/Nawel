"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatOutingDate, formatOutingDateShort } from "@/features/sortie/lib/date-fr";
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
 * stack + trailing ChevronRight. Used for every card on the public
 * profile — one visual language, whether the viewer can RSVP inline
 * or not.
 *
 * When the viewer holds an invite token and the outing is a fixed-date
 * upcoming one, `InlineRsvpSection` renders below the navigation row.
 * Chips can't nest inside the outer `<Link>` (nested interactive
 * elements), so the Link wraps only the thumbnail + text + chevron and
 * the chips live as a separate block in the same container.
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
    outing.location,
    outing.confirmedCount > 0
      ? `${outing.confirmedCount} confirmé${outing.confirmedCount > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const navigationRow = (
    <>
      {outing.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={outing.heroImageUrl}
          alt=""
          className="size-16 shrink-0 rounded-lg bg-ivoire-100 object-cover object-top"
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-16 shrink-0 rounded-lg bg-gradient-to-br from-bordeaux-50 via-ivoire-100 to-or-50"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {dateLabel && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bordeaux-600">
            {dateLabel}
          </p>
        )}
        <h3 className="truncate font-serif text-base font-bold leading-tight text-encre-700 group-hover:text-or-600">
          {outing.title}
        </h3>
        {meta && <p className="truncate text-xs text-encre-500">{meta}</p>}
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-encre-300 transition-colors group-hover:text-or-600"
      />
    </>
  );

  if (canInlineRsvp) {
    // Row + chips share an outer article. The navigation parts live
    // inside a Link; the chips live outside it so they can be
    // interactive buttons in their own right.
    return (
      <article className="rounded-xl bg-ivoire-50 p-3 ring-1 ring-encre-700/5">
        <Link href={href} className="group flex items-center gap-3">
          {navigationRow}
        </Link>
        <div className="mt-3">
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

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl bg-ivoire-50 p-3 ring-1 ring-encre-700/5 transition-colors hover:ring-or-500"
    >
      {navigationRow}
    </Link>
  );
}
