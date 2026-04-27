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
 * Layout vertical : le bloc texte (date + titre + lieu + CTA) sit
 * au-dessus de l'image, dans le flux normal du main (donc avec son
 * propre padding `px-6` hérité). L'image vient en dessous full-bleed,
 * avec un cap de hauteur pour éviter qu'un poster vertical pousse
 * tout le contenu sous la fold ; `object-position: center` la centre
 * verticalement et horizontalement (préférable au crop bas/haut
 * arbitraire qu'on avait avant).
 *
 * Le `pt-[5rem]` du bloc texte laisse passer la nav flottante
 * (Accueil ↗ / Modifier ↗) qui sit en `absolute top-0` dans la
 * `<main>` parente.
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
    <header className="-mx-6 mb-10">
      <div className="px-6 pt-[max(env(safe-area-inset-top),5rem)] pb-6 sm:px-10">
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
                // `download` est une suggestion : iOS / Android traitent
                // le MIME `text/calendar` comme "Ajouter à l'agenda"
                // peu importe ; le filename rend le fallback download
                // lisible côté desktop.
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

      {heroImageUrl ? (
        // Remote ticket-CDN image. On ne whiteliste pas chaque domaine
        // pour next/image — ces images sont déjà cachées sur leur CDN
        // d'origine. `data-vt-poster` opte pour la View Transitions
        // morph (cf. sortie.css) sur les navigateurs qui la supportent.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          data-vt-poster
          className="block h-[55dvh] max-h-[640px] min-h-[320px] w-full object-cover object-center"
          style={{ filter: "saturate(1.15) contrast(1.05)" }}
        />
      ) : (
        <div className="relative h-[55dvh] max-h-[640px] min-h-[320px] w-full overflow-hidden">
          <GradientFallback title={title} />
        </div>
      )}
    </header>
  );
}

function GradientFallback({ title }: { title: string }) {
  // Initiale du titre rendue en énorme sous le scrim — donne un ancrage
  // typographique à l'empty state plutôt qu'un dégradé plat.
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
        className="text-[14rem] leading-none font-black opacity-40 select-none sm:text-[18rem]"
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
