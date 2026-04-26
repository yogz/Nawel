"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import type { TicketmasterResult } from "@/app/api/sortie/search-ticketmaster/route";

type Props = {
  results: TicketmasterResult[];
  // Quand non-null, l'API Ticketmaster a corrigé une faute d'orthographe
  // dans `originalQuery` et a renvoyé les résultats pour `correctedQuery`.
  // On l'affiche au-dessus de la liste pour que l'utilisateur comprenne
  // pourquoi les résultats ne matchent pas littéralement ce qu'il a tapé.
  correctedQuery: string | null;
  originalQuery: string;
  // True entre la 1re saisie ≥3 chars et la 1re réponse de l'API. Permet
  // d'afficher des skeletons pendant les ~700 ms (debounce + fetch) où
  // sinon l'écran reste figé après la frappe.
  isLoading: boolean;
  onPick: (result: TicketmasterResult) => void;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatStartsAt(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return dateFormatter.format(date);
}

/**
 * Best-effort suggestion list shown under the paste-step input when the
 * user types free text matched by Ticketmaster. Click to pre-fill the
 * wizard like an URL paste. Renders nothing when results are empty so
 * the absence of matches is invisible to the user.
 */
export function TicketmasterSuggestions({
  results,
  correctedQuery,
  originalQuery,
  isLoading,
  onPick,
}: Props) {
  // Skeleton dès que la frappe a lieu — 2 cards grises animate-pulse
  // qui matchent le layout des vraies (image 56×56 + 2 lignes texte).
  // Évite le moment "rien ne se passe" entre la dernière touche et la
  // 1re réponse de l'API.
  if (results.length === 0 && isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-bordeaux-600">
          <Sparkles size={12} />
          Recherche Ticketmaster…
        </div>
        <ul className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <li key={i}>
              <div className="flex items-start gap-3 rounded-xl border border-encre-200 bg-ivoire-100 p-3">
                <div className="size-14 shrink-0 animate-pulse rounded-lg bg-ivoire-300" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-ivoire-300" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-ivoire-300" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    );
  }
  if (results.length === 0) {
    return null;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-bordeaux-600">
        <Sparkles size={12} />
        Suggestions Ticketmaster
      </div>
      {correctedQuery && correctedQuery.toLowerCase() !== originalQuery.toLowerCase() && (
        <p className="px-1 text-xs text-encre-500">
          Aucun résultat pour <span className="font-medium">«&nbsp;{originalQuery}&nbsp;»</span> —
          affichage pour{" "}
          <span className="font-medium text-encre-700">«&nbsp;{correctedQuery}&nbsp;»</span>.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {results.map((result) => {
          const venueLine = [result.venue, result.city].filter(Boolean).join(" — ");
          const dateLine = formatStartsAt(result.startsAt);
          return (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => onPick(result)}
                aria-label={`Choisir ${result.title}`}
                className="flex w-full items-start gap-3 rounded-xl border border-encre-200 bg-ivoire-100 p-3 text-left transition-colors duration-300 hover:border-bordeaux-300 hover:bg-ivoire-200 focus-visible:border-bordeaux-400 focus-visible:bg-ivoire-200 focus-visible:outline-none"
              >
                {result.image ? (
                  // `unoptimized` skips Next's image proxy — Ticketmaster's
                  // CDN (s1.ticketm.net) isn't in next.config remotePatterns
                  // and whitelisting it for a 56px thumbnail in a best-effort
                  // widget would be over-engineering. Direct CDN load is fine.
                  <Image
                    src={result.image}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    loading="lazy"
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-ivoire-300 text-encre-400">
                    <MapPin size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-encre-700">{result.title}</p>
                  {venueLine && <p className="truncate text-xs text-encre-500">{venueLine}</p>}
                  {dateLine && (
                    <p className="truncate text-xs font-medium text-bordeaux-600">{dateLine}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
