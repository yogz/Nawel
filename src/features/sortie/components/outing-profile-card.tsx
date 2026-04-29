"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import {
  formatOutingDate,
  formatOutingDateShort,
  formatVotedSlotsCompact,
} from "@/features/sortie/lib/date-fr";
import {
  formatDeadlineCountdown,
  type DeadlineTone,
} from "@/features/sortie/lib/deadline-countdown";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { LOCK_GLYPH, resolveLockReason } from "@/features/sortie/lib/lock-reason";
import { isFixedRsvp, type RsvpResponseAny } from "@/features/sortie/lib/rsvp-response";
import { InlineRsvpSection } from "./inline-rsvp-section";

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
    response: RsvpResponseAny;
    name: string;
    extraAdults: number;
    extraChildren: number;
    email?: string;
    // Créneaux choisis en mode vote (vide ou absent en mode fixed).
    // Triés ASC, dédupliqués par jour côté formatter.
    votedSlots?: Date[];
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
  // Quand la deadline RSVP est dépassée, on cache complètement les
  // boutons (inline picker + CTA "Je vote") : la sortie est verrouillée,
  // l'invité ne peut plus changer son avis depuis la card. Les actions
  // restent accessibles côté server (cf. participant-actions.ts) où
  // elles sont rejetées avec un message clair, mais l'UI ne les
  // expose plus pour ne pas suggérer une action impossible.
  const deadlinePassed = outing.deadlineAt.getTime() < Date.now();
  const canInlineRsvp = showRsvp && !isPast && !deadlinePassed && outing.mode === "fixed";
  const needsVoteCta = showRsvp && !isPast && !deadlinePassed && outing.mode === "vote";

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
  //  - titre & meta : couleur abaissée d'un cran (ink-500 / ink-400
  //    au lieu de ink-700 / ink-500), pour que le texte aussi se
  //    lise comme estompé et pas seulement transparent.
  const pastWrapperClasses = isPast
    ? "opacity-80 transition-opacity duration-300 hover:opacity-100"
    : "";
  const pastImageClasses = isPast
    ? "grayscale opacity-80 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100"
    : "";
  const pastTitleClasses = isPast ? "text-ink-500" : "text-ink-700";
  const pastMetaClasses = isPast ? "text-ink-400" : "text-ink-500";

  // First letter of the title for the poster-less fallback thumbnail.
  // Same visual vocabulary as the LiveStatusHero empty state — gradient
  // panel with a big typographic initial instead of a dead color swatch.
  const initial = (outing.title.trim().charAt(0) || "·").toLocaleUpperCase("fr");

  // Badge "verrouillé" en bottom-right du thumb. cf. `resolveLockReason`
  // pour la précédence des 3 états (purchased > vote-tranché > deadline).
  // Aria-hidden : l'info est déjà portée par le countdown texte de la
  // card, le badge est purement visuel.
  const lockReason = resolveLockReason(outing);
  const LockGlyph = lockReason ? LOCK_GLYPH[lockReason] : null;

  const navigationRow = (
    <>
      <div className="relative size-16 shrink-0">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            className={`size-16 rounded-md bg-surface-100 object-cover object-top ${pastImageClasses}`}
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
            className={`relative flex size-16 items-center justify-center overflow-hidden rounded-md ${pastImageClasses}`}
            style={{
              background:
                "radial-gradient(circle at 30% 20%, #FF3D81 0%, transparent 50%), radial-gradient(circle at 75% 80%, #C7FF3C 0%, transparent 50%), #1a1a1a",
            }}
          >
            <span
              className="text-2xl font-black leading-none tracking-tight text-ink-50 opacity-50 select-none"
              style={{
                fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                mixBlendMode: "overlay",
              }}
            >
              {initial}
            </span>
          </div>
        )}
        {LockGlyph && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 inline-flex size-[18px] items-center justify-center rounded-full bg-ink-700 text-surface-50 ring-1 ring-surface-50"
          >
            <LockGlyph size={10} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {dateLabel && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-acid-600">
            {dateLabel}
          </p>
        )}
        <h3
          className={`truncate text-[17px] leading-tight font-black tracking-[-0.025em] group-hover:text-acid-600 ${pastTitleClasses}`}
        >
          {outing.title}
        </h3>
        {meta && <p className={`truncate text-[13px] ${pastMetaClasses}`}>{meta}</p>}
        {/* Countdown deadline dans la nav row — utile quand il n'y
            a pas de barre d'actions séparée (mode fixed inline RSVP,
            ou nav-only). Pour le mode vote on le déplace à côté du
            CTA "Vote pour la date" pour que l'invité voie l'urgence
            sur l'action elle-même, pas dans la meta de la carte. */}
        {countdown && (
          // Countdown TOUJOURS dans la meta de la card (sous le
          // titre + lieu), peu importe le mode (fixed ou vote).
          // Avant : on l'affichait à droite du CTA en mode vote, ce
          // qui forçait l'œil à scanner à 2 endroits différents
          // selon le type de sortie. Symétrie cross-cards = lecture
          // plus rapide en liste.
          <p
            className={`mt-1 inline-flex w-fit items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
              countdown.tone === "urgent"
                ? "rounded-full bg-hot-50 px-2 py-0.5 text-hot-500"
                : toneClasses(countdown.tone)
            }`}
          >
            {countdown.tone === "urgent" && (
              <span
                aria-hidden
                className="sortie-deadline-halo inline-block h-1.5 w-1.5 rounded-full bg-hot-500"
              />
            )}
            {countdown.label}
          </p>
        )}
      </div>
    </>
  );

  if (needsVoteCta) {
    // Pas d'inline picker : la matrix de créneaux est trop riche pour
    // une carte. Le CTA mène à /<canonical> où la VoteRsvpSheet prend
    // le relais.
    //
    // Asymétrie de saillance — alignée sur l'état "voté" du mode fixed
    // (chip filled + ghost) pour que la lecture en checklist soit
    // homogène cross-mode :
    //  - non voté → CTA filled acid (action requise = œil attiré)
    //  - voté    → résumé "✓ Tes dates : …" + bouton ghost discret
    //              (déjà fait, l'œil passe son chemin sur le scan)
    //
    // Le résumé liste les jours choisis (max 3 + "+N" overflow). On
    // affiche pas l'heure : les créneaux peuvent être plusieurs sur le
    // même jour, et l'heure précise se relit dans la sheet via Modifier.
    const votedSlots = myRsvp?.votedSlots ?? [];
    const hasVoted = votedSlots.length > 0;
    return (
      <article
        className={`rounded-xl bg-surface-50 p-3 ring-1 ring-ink-700/5 ${pastWrapperClasses}`}
      >
        <Link
          href={href}
          className="group -m-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-ink-700/[0.02]"
        >
          {navigationRow}
        </Link>
        <div className="mt-3 border-t border-ink-700/5 pt-3">
          {/* Pas d'eyebrow état ici : le bucket "à toi de jouer" / "en
              attente" / "tu viens" porte déjà le rôle au niveau section,
              et le filled vs ghost de la CTA signale voted vs pas-voté
              (parité avec le mode fixed qui n'a aucun eyebrow non plus). */}
          {hasVoted ? (
            <>
              <p className="mb-2 text-[13px] leading-snug text-ink-600">
                <span className="font-semibold text-ink-700">
                  {formatVotedSlotsCompact(votedSlots)}
                </span>
              </p>
              <Link
                href={href}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-ink-200 bg-transparent px-4 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-surface-100 motion-safe:active:scale-95"
              >
                Modifier les dates
                <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            </>
          ) : (
            <Link
              href={href}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-acid-600 bg-acid-50 px-4 text-sm font-semibold text-acid-700 transition-colors hover:bg-acid-100 motion-safe:active:scale-95"
            >
              <Check size={14} strokeWidth={2.6} className="text-acid-600" />
              Je vote pour une date
              <ArrowRight size={14} strokeWidth={2.4} />
            </Link>
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
        className={`rounded-xl bg-surface-50 p-3 ring-1 ring-ink-700/5 ${pastWrapperClasses}`}
      >
        <Link
          href={href}
          className="group -m-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-ink-700/[0.02]"
        >
          {navigationRow}
        </Link>
        <div className="mt-3 border-t border-ink-700/5 pt-3">
          <InlineRsvpSection
            shortId={outing.shortId}
            outingTitle={outing.title}
            outingUrl={outingUrl}
            outingDate={outing.startsAt}
            existing={myRsvp && isFixedRsvp(myRsvp) ? myRsvp : null}
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
      className={`group flex items-center gap-3 rounded-xl bg-surface-50 p-3 ring-1 ring-ink-700/5 transition-colors hover:ring-hot-500 ${pastWrapperClasses}`}
    >
      {navigationRow}
      <ChevronRight
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-ink-300 transition-colors group-hover:text-hot-600"
      />
    </Link>
  );
}

function toneClasses(tone: DeadlineTone): string {
  switch (tone) {
    case "urgent":
      return "text-hot-500";
    case "soon":
      return "text-hot-600";
    case "neutral":
      return "text-ink-400";
    case "closed":
      return "text-ink-300";
  }
}
