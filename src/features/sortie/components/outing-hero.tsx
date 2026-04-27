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
 * Composition en superposition : l'image est full-bleed avec une
 * hauteur capée (cropée verticalement via `object-cover object-center`
 * si elle est trop haute) et le bloc texte sit en `absolute top-0`
 * par-dessus, sous un scrim qui assombrit le haut pour rendre le
 * titre lisible peu importe la dominante de la photo. Le `min-h`
 * garantit assez de surface pour que les CTA (Prendre mes places /
 * Agenda) tiennent sans déborder du scrim.
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
    <header className="relative -mx-6 mb-10 h-[60dvh] max-h-[640px] min-h-[480px] overflow-hidden">
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
          style={{ filter: "saturate(1.15) contrast(1.05)" }}
        />
      ) : (
        <GradientFallback title={title} />
      )}

      {/* Scrim — assombrit le haut (zone du texte) pour garantir un
          contraste AAA peu importe la photo source ; estompe au
          milieu pour laisser respirer l'image. Pas de scrim au bas :
          la transition vers la suite de la page sit à l'extérieur
          du hero. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.45) 35%, rgba(10,10,10,0) 70%)",
        }}
      />

      <div className="absolute inset-x-0 top-0 flex flex-col items-start px-6 pt-[max(env(safe-area-inset-top),4.5rem)] pb-10 sm:px-10">
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
          style={{ textWrap: "balance", textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}
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
                // `download` est une suggestion : iOS / Android
                // traitent le MIME `text/calendar` comme "Ajouter à
                // l'agenda" peu importe ; le filename rend le
                // fallback download lisible côté desktop.
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
