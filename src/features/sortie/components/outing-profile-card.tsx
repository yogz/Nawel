"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { formatOutingDate, formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import {
  formatDeadlineCountdown,
  type DeadlineTone,
} from "@/features/sortie/lib/deadline-countdown";
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
  // plain row layout with a "Vote pour la date" CTA that ouvre la
  // page de la sortie où la VoteRsvpSheet est dispo.
  const canInlineRsvp = showRsvp && !isPast && outing.mode === "fixed";
  const needsVoteCta = showRsvp && !isPast && outing.mode === "vote";

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

  // Compteur "temps restant avant fermeture" — affiché sur toutes les
  // cartes upcoming pour que l'invité voie l'urgence sans cliquer. On
  // skip pour les sortes passées (Réponses closes par évidence) et
  // pour les sortes annulées si jamais une row cancelled passe le
  // filtre côté query.
  const countdown =
    !isPast && outing.status !== "cancelled" ? formatDeadlineCountdown(outing.deadlineAt) : null;

  // L'eyebrow `✓ TU VIENS` qui existait avant a été retiré : il
  // était redondant avec l'état filled du segmented `Je viens` /
  // `Je passe` qui dit déjà la réponse. Cf. review graphic
  // designer + UX. La date (en eyebrow vert) reste l'unique repère
  // temporel sur la card.

  // Sortie passée : on dégrade visuellement pour qu'elle se lise comme
  // un souvenir et non comme une action en attente. Trois axes appliqués
  // explicitement (pas via arbitrary variant `[&_img]`, qui peut filer
  // entre les mailles du JIT Tailwind selon la config) :
  //  - wrapper : opacité globale, restaurée au hover
  //  - image / fallback : grayscale + leger fade
  //  - titre & meta : couleur abaissée d'un cran (encre-500 / encre-400
  //    au lieu de encre-700 / encre-500), pour que le texte aussi se
  //    lise comme estompé et pas seulement transparent.
  const pastWrapperClasses = isPast
    ? "opacity-80 transition-opacity duration-300 hover:opacity-100"
    : "";
  const pastImageClasses = isPast
    ? "grayscale opacity-80 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100"
    : "";
  const pastTitleClasses = isPast ? "text-encre-500" : "text-encre-700";
  const pastMetaClasses = isPast ? "text-encre-400" : "text-encre-500";

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
          className={`size-16 shrink-0 rounded-md bg-ivoire-100 object-cover object-top ${pastImageClasses}`}
          // Filter saturate + contrast aligné sur le hero détail
          // (`OutingHero`). Donne une cohérence visuelle malgré
          // les sources hétérogènes (Ticketmaster, Fnac, AllOcc,
          // uploads users) qui ont chacune leur propre balance
          // colorimétrique. Pas appliqué aux past (le grayscale
          // du `pastImageClasses` prend le dessus).
          style={isPast ? undefined : { filter: "saturate(1.15) contrast(1.05)" }}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md ${pastImageClasses}`}
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
        {dateLabel && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bordeaux-600">
            {dateLabel}
          </p>
        )}
        <h3
          className={`truncate text-[17px] leading-tight font-black tracking-[-0.025em] group-hover:text-bordeaux-600 ${pastTitleClasses}`}
        >
          {outing.title}
        </h3>
        {meta && <p className={`truncate text-[13px] ${pastMetaClasses}`}>{meta}</p>}
        {/* Countdown deadline dans la nav row — utile quand il n'y
            a pas de barre d'actions séparée (mode fixed inline RSVP,
            ou nav-only). Pour le mode vote on le déplace à côté du
            CTA "Vote pour la date" pour que l'invité voie l'urgence
            sur l'action elle-même, pas dans la meta de la carte. */}
        {countdown && !needsVoteCta && (
          <p
            className={`mt-1 inline-flex w-fit items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
              countdown.tone === "urgent"
                ? "rounded-full bg-or-50 px-2 py-0.5 text-or-500"
                : toneClasses(countdown.tone)
            }`}
          >
            {countdown.tone === "urgent" && (
              <span
                aria-hidden
                className="sortie-deadline-halo inline-block h-1.5 w-1.5 rounded-full bg-or-500"
              />
            )}
            {countdown.label}
          </p>
        )}
      </div>
    </>
  );

  if (needsVoteCta) {
    // Cas mode vote sur lien privé : pas d'inline picker (la matrix
    // de créneaux est trop riche pour une carte), mais on surface un
    // CTA "Vote pour la date" pill acid pour que l'urgence saute aux
    // yeux dans la liste. La carte entière reste navigable vers
    // /<canonical> où la VoteRsvpSheet est dispo.
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-encre-700/5 pt-3">
          <Link
            href={href}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-bordeaux-600 px-4 text-[13px] font-bold text-encre-50 shadow-[var(--shadow-acid)] transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.01] hover:bg-bordeaux-700 motion-safe:active:scale-95"
          >
            Vote pour la date
            <ArrowRight size={14} strokeWidth={2.6} />
          </Link>
          {countdown && (
            // Countdown collé au CTA — l'invité lit l'action et son
            // urgence d'un coup. justify-between l'aligne à droite
            // sur la même rangée ; sur écran étroit, le wrap natural
            // le passe en dessous proprement (gap-y-2).
            <p
              className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
                countdown.tone === "urgent"
                  ? "rounded-full bg-or-50 px-2 py-0.5 text-or-500"
                  : toneClasses(countdown.tone)
              }`}
            >
              {countdown.tone === "urgent" && (
                <span
                  aria-hidden
                  className="sortie-deadline-halo inline-block h-1.5 w-1.5 rounded-full bg-or-500"
                />
              )}
              {countdown.label}
            </p>
          )}
        </div>
      </article>
    );
  }

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
            outingPath={canonical}
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
  // Helper d'origine accessible plus bas (déclaré avant pour le rendu
  // précédent).
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

function toneClasses(tone: DeadlineTone): string {
  switch (tone) {
    case "urgent":
      return "text-or-500";
    case "soon":
      return "text-or-600";
    case "neutral":
      return "text-encre-400";
    case "closed":
      return "text-encre-300";
  }
}
