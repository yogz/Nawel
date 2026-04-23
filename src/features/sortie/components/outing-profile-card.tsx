"use client";

import Link from "next/link";
import { Users } from "lucide-react";
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
  // full timeslot matrix (too heavy for a card) — fall back to a link to
  // the outing page until we design a dedicated voting sheet.
  const canInlineRsvp = showRsvp && !isPast && outing.mode === "fixed";

  return (
    <article className="overflow-hidden rounded-2xl border border-ivoire-400 bg-ivoire-50 transition-colors hover:border-or-500">
      {outing.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={outing.heroImageUrl}
          alt=""
          className="aspect-[21/9] w-full bg-ivoire-100 object-cover object-top"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-[21/9] w-full bg-gradient-to-br from-bordeaux-50 via-ivoire-100 to-or-50"
        />
      )}

      <div className="flex flex-col gap-3 p-4">
        {outing.startsAt && (
          <p className="inline-flex w-fit items-center rounded-full bg-bordeaux-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-bordeaux-700">
            {isPast ? formatOutingDateShort(outing.startsAt) : formatOutingDate(outing.startsAt)}
          </p>
        )}

        <div>
          <Link href={href} className="group inline-block">
            <h3 className="font-serif text-xl text-encre-700 group-hover:text-bordeaux-700">
              {outing.title}
            </h3>
          </Link>
          {outing.location && <p className="mt-1 text-sm text-encre-400">{outing.location}</p>}
        </div>

        {outing.confirmedCount > 0 && (
          <p className="inline-flex items-center gap-1.5 text-xs text-encre-500">
            <Users size={12} />
            {outing.confirmedCount} confirmé{outing.confirmedCount > 1 ? "s" : ""}
          </p>
        )}

        {canInlineRsvp ? (
          <>
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
          </>
        ) : (
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-1 rounded-full bg-bordeaux-600 px-4 py-2 text-sm font-semibold text-ivoire-50 transition-colors hover:bg-bordeaux-700"
          >
            Voir la sortie →
          </Link>
        )}
      </div>
    </article>
  );
}
