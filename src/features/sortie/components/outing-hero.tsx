import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { formatOutingDate } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  ticketUrl: string | null;
  heroImageUrl?: string | null;
  /** Canonical `slug-shortId` path of the outing — used to link to the
   * iCalendar download (`/<canonicalPath>/agenda`). Optional so vote-
   * mode pages (no fixed date) can render the hero without the
   * "Ajouter à mon agenda" affordance. */
  canonicalPath?: string;
};

/**
 * Full-bleed hero on the event detail page. The image (or a gradient
 * fallback) covers the top ~78dvh of the viewport with a darkening
 * scrim so the title sits flush at bottom-left, GenZ-poster style.
 *
 * The component uses negative horizontal margins (`-mx-6`) to escape
 * the parent's `max-w-xl px-6` container. The page is responsible for
 * placing the back / share nav as an overlay (`absolute top-0`).
 */
export function OutingHero({
  title,
  location,
  startsAt,
  ticketUrl,
  heroImageUrl,
  canonicalPath,
}: Props) {
  // CSS escape from the parent's `max-w-xl px-6` container: position
  // left:50%, then translate -50% in X, then claim 100vw width.
  //
  // Hauteur du header : `min-h-[560px]` garantit assez de place pour
  // que le bloc texte (positionné en `absolute bottom-0`) ne déborde
  // pas au-dessus de l'image quand celle-ci est en paysage court
  // (~520×290 typique d'un poster Ticketmaster) — sinon le titre est
  // clippé par `overflow-hidden`. `max-h-[88dvh]` borne les photos
  // très verticales pour garder le texte au-dessus de la fold.
  // L'image reste en `w-full h-auto` (ratio natif respecté, aucun crop
  // latéral). Quand elle est plus courte que `min-h`, le background
  // ivoire-900 couvre la zone restante et le scrim continue son
  // dégradé jusqu'au texte sans rupture visible.
  return (
    <header className="relative left-1/2 mb-10 max-h-[88dvh] min-h-[560px] w-[min(100vw,520px)] -translate-x-1/2 overflow-hidden bg-ivoire-50">
      {heroImageUrl ? (
        // Remote ticket-CDN image. Whitelisting each domain for
        // next/image would be a maintenance task; these images are
        // already cached on their original CDNs.
        // `data-vt-poster` opts into the View Transitions morph (see
        // sortie.css) when the browser supports it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          data-vt-poster
          className="block h-auto w-full"
          style={{ filter: "saturate(1.15) contrast(1.05)" }}
        />
      ) : (
        <GradientFallback title={title} />
      )}

      {/* Darkening scrim — three-stop linear keeps the top ~25 % of
          the photo visible (lets the user read the venue ambiance)
          while stamping the bottom 45 % so the headline reads at
          AAA on any source photo. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0) 25%, rgba(10,10,10,0) 50%, rgba(10,10,10,0.95) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start px-6 pb-10 sm:px-10 sm:pb-14">
        {startsAt && (
          <p className="mb-4 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
            />
            {formatOutingDate(startsAt).toUpperCase()}
          </p>
        )}

        <h1
          className="text-[44px] leading-[0.92] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl"
          style={{ textWrap: "balance" }}
        >
          {title}
        </h1>

        {location && (
          <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-encre-600">
            ◉ {formatVenue(location)}
          </p>
        )}

        {(ticketUrl || (startsAt && canonicalPath)) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {ticketUrl && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-bordeaux-600 underline-offset-4 hover:underline"
              >
                Prendre mes places
                <ArrowUpRight size={14} strokeWidth={2.4} />
              </a>
            )}
            {startsAt && canonicalPath && (
              <a
                href={`/${canonicalPath}/agenda`}
                // `download` is a hint to the browser — iOS / Android
                // treat the `text/calendar` MIME as "add to calendar"
                // regardless, but the filename makes the fallback
                // download readable on desktop.
                download={`sortie-${canonicalPath}.ics`}
                className="inline-flex items-center gap-1 text-encre-600 underline-offset-4 hover:text-bordeaux-600 hover:underline"
              >
                <CalendarPlus size={14} strokeWidth={2.2} />
                Ajouter à mon agenda
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function GradientFallback({ title }: { title: string }) {
  // First letter of the title rendered huge under the scrim — gives
  // the empty state a typographic anchor instead of a flat gradient.
  const initial = (title.trim().charAt(0) || "·").toLocaleUpperCase("fr");
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 25% 20%, #FF3D81 0%, transparent 45%), radial-gradient(circle at 80% 80%, #C7FF3C 0%, transparent 45%), #1a1a1a",
      }}
    >
      <span
        className="text-[18rem] leading-none font-black opacity-40 select-none sm:text-[22rem]"
        style={{
          fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
          color: "#0A0A0A",
          mixBlendMode: "overlay",
        }}
      >
        {initial}
      </span>
    </div>
  );
}
