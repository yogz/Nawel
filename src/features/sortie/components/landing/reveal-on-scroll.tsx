"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Optional callback fired once when the element enters the viewport.
   * Used by sections to emit an Umami `landing_section_visible` event. */
  onReveal?: () => void;
  /** Threshold pour IntersectionObserver. Default 0.4 — assez pour
   * déclencher avant que la section soit pleinement visible (au scroll
   * un user voit le contenu apparaître au lieu d'arriver "déjà animé"). */
  threshold?: number;
  className?: string;
};

/**
 * Wrap any block to reveal-on-scroll once. Used by landing sections to
 * stagger entrance sans animer au paint initial (no FOUC). Si JS est
 * désactivé, le fallback CSS via `noscript` n'est pas câblé — Sortie
 * suppose JS dispo (auth client-side, Umami, etc.).
 *
 * État initial `revealed=false` → opacity-0 + translate-y-3. Au mount
 * client, l'IO démarre. Si l'élément est déjà au-dessus du fold (cas
 * landing courte ou ancre directe), l'IO fire immédiatement → reveal
 * sans flash perceptible. Si l'élément est en dessous, on garde caché
 * jusqu'au scroll qui le ramène dans le viewport.
 */
export function RevealOnScroll({ children, onReveal, threshold = 0.4, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed || !ref.current) {
      return;
    }
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          onReveal?.();
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, threshold, onReveal]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
