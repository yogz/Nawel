"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
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
 * Two layouts for the same component depending on interactivity:
 *
 *   - **Inline-RSVP card** (visitor with valid `?k=` token, upcoming,
 *     fixed-mode): the original vertical layout with the poster on top
 *     and RSVP chips inside. Can't be a Link because of nested buttons.
 *
 *   - **Compact row** (everyone else — public visitors and past
 *     outings): horizontal row with a square 64px thumbnail on the
 *     left and the metadata stack on the right. Letterboxd / Apple
 *     Music pattern. ~88px tall vs ~180px for the old stacked card,
 *     which makes a multi-outing profile scannable without scrolling.
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
  // full timeslot matrix (too heavy for a card) — fall back to the row
  // layout until we design a dedicated voting sheet.
  const canInlineRsvp = showRsvp && !isPast && outing.mode === "fixed";

  if (canInlineRsvp) {
    return (
      <article className="overflow-hidden rounded-2xl bg-ivoire-50 shadow-[var(--shadow-sm)] ring-1 ring-encre-700/5 transition-shadow hover:shadow-[var(--shadow-md)]">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            className="aspect-[3/1] w-full bg-ivoire-100 object-cover object-top"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-[3/1] w-full bg-gradient-to-br from-bordeaux-50 via-ivoire-100 to-or-50"
          />
        )}
        <div className="flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {outing.startsAt && (
              <p className="inline-flex items-center rounded-full bg-bordeaux-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bordeaux-700">
                {formatOutingDate(outing.startsAt)}
              </p>
            )}
            {outing.confirmedCount > 0 && (
              <p className="inline-flex items-center gap-1 text-xs text-encre-500">
                <Users size={12} />
                {outing.confirmedCount}
              </p>
            )}
          </div>
          <div>
            <h3 className="font-serif text-lg leading-tight text-encre-700">{outing.title}</h3>
            {outing.location && <p className="mt-0.5 text-xs text-encre-400">{outing.location}</p>}
          </div>
          <InlineRsvpSection
            shortId={outing.shortId}
            outingTitle={outing.title}
            outingUrl={outingUrl}
            outingDate={outing.startsAt}
            existing={myRsvp}
            loggedInName={loggedInName}
          />
          <Link
            href={href}
            className="text-xs text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
          >
            Voir la sortie →
          </Link>
        </div>
      </article>
    );
  }

  // Compact row: 64px square thumb + metadata stack. Full row tappable.
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

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl bg-ivoire-50 p-3 ring-1 ring-encre-700/5 transition-colors hover:ring-or-500"
    >
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
    </Link>
  );
}
