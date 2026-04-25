"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventDetails } from "@/lib/gemini-search";

type Props = {
  data: EventDetails;
  onAccept: () => void;
  onDismiss: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatStartsAt(iso: string): string | null {
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
 * Suggestion confirmable affichée quand Gemini a trouvé un événement
 * en fallback (URL non parseable ou aucun hit Ticketmaster). L'utilisateur
 * doit valider avant que les champs soient injectés dans le wizard, parce
 * que la confiance de Gemini est rarement "high" (URL absente, date
 * approximative…).
 */
export function GeminiSuggestionCard({ data, onAccept, onDismiss }: Props) {
  const venueLine = [data.venue, data.city].filter(Boolean).join(" — ");
  const dateLine = formatStartsAt(data.startsAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-3 rounded-2xl border border-bordeaux-300 bg-ivoire-100 p-4"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-bordeaux-600">
        <Sparkles size={12} />
        Trouvé sur le web
      </div>

      <div className="flex items-start gap-3">
        {data.heroImageUrl ? (
          <Image
            src={data.heroImageUrl}
            alt=""
            width={64}
            height={64}
            unoptimized
            loading="lazy"
            className="size-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-ivoire-300 text-encre-400">
            <MapPin size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-encre-700">{data.title}</p>
          {venueLine && <p className="mt-0.5 truncate text-xs text-encre-500">{venueLine}</p>}
          {dateLine && (
            <p className="mt-0.5 truncate text-xs font-medium text-bordeaux-600">{dateLine}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-encre-500">C&apos;est bien ça ?</p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          className="flex-1 rounded-full text-sm font-bold"
        >
          Oui, utiliser
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDismiss}
          className="flex-1 rounded-full text-sm font-medium"
        >
          Non
        </Button>
      </div>
    </motion.div>
  );
}
