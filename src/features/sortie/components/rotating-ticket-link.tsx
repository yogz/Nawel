"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const TEXTS = ["Prendre tes billets", "Info sur l'événement"] as const;
const ROTATE_INTERVAL_MS = 3500;
// Texte le plus long du jeu — sert de placeholder invisible pour
// réserver la largeur du conteneur. Garde le picto à droite stable
// quand le texte rotate (sinon l'icône saute de quelques px à chaque
// swap, effet wobble pas joli).
const LONGEST_TEXT = TEXTS.reduce((a, b) => (a.length >= b.length ? a : b));

/**
 * Lien billetterie qui crossfade entre deux libellés ("Prendre tes
 * billets" / "Info sur l'événement"). Le slash dans la copy fixe
 * (cf. PR #170) marche bien dans le hero text, mais en lien actif on
 * gagne en clarté à montrer une seule promesse à la fois — et le
 * mouvement attire l'œil sur le CTA principal au-dessus du fold.
 *
 * Garde-fous :
 * - Respecte `prefers-reduced-motion: reduce` → affiche un seul libellé
 *   sans rotation pour les users qui ont demandé moins d'animations.
 * - Largeur du conteneur figée sur le libellé le plus long → pas de
 *   layout shift, le picto `↗` reste à la même position pendant le
 *   crossfade.
 *
 * Client Component minimaliste extrait pour ne pas convertir tout
 * `OutingHero` en client (il fait du SSR sur la page détail).
 */
export function RotatingTicketLink({ href }: { href: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      return;
    }
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % TEXTS.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-acid-600 underline-offset-4 hover:underline"
    >
      <span className="relative inline-block">
        {/* Placeholder invisible : réserve la largeur du libellé le
            plus long pour que le picto reste figé pendant le crossfade.
            `whitespace-nowrap` évite le wrap si la prop CSS du parent
            essayerait de casser. */}
        <span aria-hidden="true" className="invisible whitespace-nowrap">
          {LONGEST_TEXT}
        </span>
        <span className="absolute inset-0 whitespace-nowrap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={TEXTS[index]}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="inline-block"
            >
              {TEXTS[index]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <ArrowUpRight size={14} strokeWidth={2.4} />
    </a>
  );
}
