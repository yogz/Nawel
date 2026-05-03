"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

type Ctx = {
  activeId: string;
  register: (id: string, el: HTMLElement) => () => void;
};

const EyebrowFocusContext = createContext<Ctx | null>(null);

type ProviderProps = {
  defaultActiveId: string;
  children: React.ReactNode;
};

/**
 * Pilote l'eyebrow "vivant" de la home identifiée : un seul tone="acid"
 * + glow à la fois, déterminé par la section qui occupe la bande centrale
 * du viewport. Les autres eyebrows s'éteignent en muted.
 *
 * Stratégie IntersectionObserver : `rootMargin: -30% 0px -30% 0px` réduit
 * la zone d'observation aux 40% centraux. Quand une section croise cette
 * bande, on retient celle dont l'`intersectionRatio` est le plus haut.
 * Effet secondaire voulu : un peu d'inertie — on ne change pas d'actif
 * tant qu'aucune autre section n'entre franchement dans la zone.
 *
 * `defaultActiveId` est rendu côté SSR + 1er paint. Au 1er scroll/tick
 * l'observer prend le relais. Choisir l'id de la section du haut.
 */
export function EyebrowFocusProvider({ defaultActiveId, children }: ProviderProps) {
  const [activeId, setActiveId] = useState(defaultActiveId);
  const ratios = useRef<Map<string, number>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);
  const pending = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.eyebrowFocusId;
          if (!id) {
            continue;
          }
          ratios.current.set(id, e.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, r] of ratios.current) {
          if (r > bestRatio) {
            bestId = id;
            bestRatio = r;
          }
        }
        if (bestId) {
          setActiveId(bestId);
        }
      },
      {
        rootMargin: "-30% 0px -30% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const el of pending.current) {
      observer.current.observe(el);
    }
    pending.current.clear();

    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, []);

  const register = useCallback((id: string, el: HTMLElement) => {
    el.dataset.eyebrowFocusId = id;
    if (observer.current) {
      observer.current.observe(el);
    } else {
      pending.current.add(el);
    }
    return () => {
      observer.current?.unobserve(el);
      pending.current.delete(el);
      ratios.current.delete(id);
    };
  }, []);

  return (
    <EyebrowFocusContext.Provider value={{ activeId, register }}>
      {children}
    </EyebrowFocusContext.Provider>
  );
}

/**
 * À attacher à l'élément racine de la section focusable. `id` peut être
 * undefined → no-op (pratique pour rendre les composants réutilisables
 * hors de la home, sans provider).
 */
export function useEyebrowFocusSectionRef<T extends HTMLElement>(
  id: string | null | undefined
): RefObject<T | null> {
  const ctx = useContext(EyebrowFocusContext);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!ctx || !id || !ref.current) {
      return;
    }
    return ctx.register(id, ref.current);
  }, [ctx, id]);

  return ref;
}

export function useEyebrowFocusActive(): string | null {
  return useContext(EyebrowFocusContext)?.activeId ?? null;
}

type FocusableEyebrowProps = {
  focusId: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
};

/**
 * Variante de `<Eyebrow>` consciente du focus actif : si `focusId` est
 * la section active du provider, rend en acid+glow ; sinon en muted
 * sans halo. Hors d'un provider, reste en acid+glow (fallback proche
 * du `<Eyebrow glow>` standard).
 *
 * Transitions sur color, background, et box-shadow pour un fondu doux
 * (~500ms) — pas de motion, juste un changement de palette.
 */
export function FocusableEyebrow({ focusId, className, id, children }: FocusableEyebrowProps) {
  const active = useEyebrowFocusActive();
  const isActive = active === null || active === focusId;
  return (
    <p
      id={id}
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] transition-colors duration-500 ease-out",
        isActive ? "text-acid-600" : "text-ink-400",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-all duration-500 ease-out",
          isActive ? "bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]" : "bg-ink-400 shadow-none"
        )}
      />
      {children}
    </p>
  );
}

type EyebrowFocusSectionProps = {
  focusId: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wrapper générique pour rendre une section observable par le provider
 * sans modifier le composant qu'elle contient. Utile quand le contenu
 * est inline / un Server Component qu'on ne veut pas convertir en client
 * juste pour poser un ref.
 */
export function EyebrowFocusSection({ focusId, className, children }: EyebrowFocusSectionProps) {
  const ref = useEyebrowFocusSectionRef<HTMLDivElement>(focusId);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
