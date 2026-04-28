"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  /** id du DOM node à scroller dans le viewport au click. */
  targetId: string;
  /** Texte du bouton — "Je vote" / "Je viens" selon le mode de la sortie. */
  label: string;
};

/**
 * FAB qui apparaît tant que la zone d'action principale (section vote
 * ou prompt RSVP) n'est pas dans le viewport, et disparaît dès qu'elle
 * y entre. Évite que l'invité scroll sans savoir où aller, sans pour
 * autant prendre le contrôle (pas d'auto-scroll, pas de modale).
 *
 * Au click : scroll smooth vers la section + pulse léger (`data-pulse`)
 * sur la cible pendant 1.4s pour confirmer "tu y es".
 *
 * Le composant est entièrement client — c'est un effet visuel
 * conditionné par le scroll, rien ne nécessite le SSR.
 */
export function ScrollToActionFab({ targetId, label }: Props) {
  const [visible, setVisible] = useState(false);
  // Stocke la cible pour ne pas relancer un querySelector à chaque click.
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) {
      return;
    }
    targetRef.current = el;

    // On considère la section "visible" dès qu'elle traverse 30 % du
    // viewport — assez pour que le FAB ne flicker pas au scroll fin
    // mais pas trop tôt pour ne pas masquer le bouton trop tôt. La
    // 1re entrée de l'observer fournit aussi l'état initial (Chrome,
    // Safari, Firefox émettent un callback synchrone après observe()),
    // donc pas besoin d'un second `setVisible` séparé qui violerait
    // la règle "no setState in effect".
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [targetId]);

  function handleClick() {
    const el = targetRef.current;
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Pulse temporaire — on laisse à la cible le soin de styler son
    // état `data-pulse="true"` (ring acid, opacity, etc). Reset après
    // 1.4s pour que l'effet reste subtil.
    el.dataset.pulse = "true";
    window.setTimeout(() => {
      delete el.dataset.pulse;
    }, 1400);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={handleClick}
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          // L'inset bottom prend le sticky bar éventuel en compte (le
          // RsvpPrompt sticky pin un bottom-bar qui mesurerait grosso
          // modo 4.5rem au-dessus de la safe area). Ici on n'apparaît
          // que quand il n'y a pas de sticky (cf. condition page),
          // donc on peut s'aligner directement sur la safe area.
          style={{
            bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))",
          }}
          className="fixed right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-acid-600 px-5 text-[15px] font-bold text-ink-50 shadow-[var(--shadow-acid)] transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.02] hover:bg-acid-700 motion-safe:active:scale-95 sm:right-8"
        >
          {label}
          <ArrowDown size={16} strokeWidth={2.6} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
