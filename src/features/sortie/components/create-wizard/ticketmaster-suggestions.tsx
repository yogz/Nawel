"use client";

import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import type { TicketmasterResult } from "@/app/api/sortie/search-ticketmaster/route";

type Props = {
  results: TicketmasterResult[];
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
export function TicketmasterSuggestions({ results, onPick }: Props) {
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
                className="flex w-full items-start gap-3 rounded-xl border border-encre-100 bg-white p-3 text-left transition-colors duration-300 hover:border-bordeaux-200 hover:bg-bordeaux-50 focus-visible:border-bordeaux-300 focus-visible:bg-bordeaux-50 focus-visible:outline-none"
              >
                {result.image ? (
                  <img
                    src={result.image}
                    alt=""
                    loading="lazy"
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-ivoire-200 text-encre-300">
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
