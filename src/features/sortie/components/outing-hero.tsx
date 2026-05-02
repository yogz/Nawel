import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { OUTING_IMAGE_FILTER } from "@/features/sortie/lib/image-filter";

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
 * Hero "affiche" : photo full-bleed qui couvre toute la zone, titre
 * en bas-gauche sur un scrim qui s'intensifie en pied. Le sujet de
 * la photo respire dans les 60 % supérieurs, le titre signe en fin
 * de scan visuel comme sur une affiche Netflix / A24. `min-h-[480px]`
 * garantit assez de surface pour que le bloc texte tienne sans
 * déborder du scrim, peu importe le format de la photo source.
 *
 * Quand l'image est paysage courte et ne remplit pas le header, le
 * background `bg-surface-50` (noir du theme dark) prend le relais ;
 * le scrim continue son dégradé sans rupture visible.
 */
export function OutingHero({
  title,
  location,
  startsAt,
  ticketUrl,
  heroImageUrl,
  canonicalPath,
}: Props) {
  return (
    <header className="relative -mx-6 mb-0 h-[55dvh] max-h-[600px] min-h-[400px] overflow-hidden bg-surface-50">
      {heroImageUrl ? (
        // Remote ticket-CDN image. Whitelister chaque domaine pour
        // next/image serait une charge de maintenance ; ces images
        // sont déjà cachées sur leur CDN d'origine. `data-vt-poster`
        // opte pour la View Transitions morph (cf. sortie.css).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          data-vt-poster
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ filter: OUTING_IMAGE_FILTER }}
        />
      ) : (
        <GradientFallback title={title} />
      )}

      {/* Scrim — transparent en haut (le sujet de la photo respire),
          s'intensifie sur la moitié basse pour stamper le titre en
          AAA peu importe la dominante de la photo source. Pattern
          "movie poster" classique. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 35%, rgba(10,10,10,0.55) 65%, rgba(10,10,10,0.95) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start px-6 pb-10 sm:px-10 sm:pb-14">
        <h1
          className="text-[44px] leading-[0.92] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl"
          style={{ textWrap: "balance" }}
        >
          {/* Plus de text-shadow : le scrim 95% en pied garantit déjà
              le contraste, et le shadow rendait les letterforms
              légèrement boueuses sur les zones plus claires. */}
          {title}
        </h1>

        {location && (
          <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-600">
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
                className="inline-flex items-center gap-1 font-medium text-acid-600 underline-offset-4 hover:underline"
              >
                Voir l&rsquo;événement
                <ArrowUpRight size={14} strokeWidth={2.4} />
              </a>
            )}
            {startsAt && canonicalPath && (
              <a
                href={`/${canonicalPath}/agenda`}
                // `download` est une suggestion : iOS / Android
                // traitent le MIME `text/calendar` comme "Ajouter à
                // l'agenda" peu importe ; le filename rend le
                // fallback download lisible côté desktop.
                download={`sortie-${canonicalPath}.ics`}
                className="inline-flex items-center gap-1 text-ink-600 underline-offset-4 hover:text-acid-600 hover:underline"
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
  // Initiale du titre rendue en énorme — donne un ancrage typo à
  // l'empty state plutôt qu'un dégradé plat.
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
        className="font-display text-[14rem] leading-none font-black opacity-40 select-none sm:text-[18rem]"
        style={{ color: "#0A0A0A", mixBlendMode: "overlay" }}
      >
        {initial}
      </span>
    </div>
  );
}
