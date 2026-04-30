"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Fired once when the element enters the viewport. */
  onReveal?: () => void;
  className?: string;
};

const THRESHOLD = 0.4;

export function RevealOnScroll({ children, onReveal, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  // Stable ref pour onReveal : sans ça un nouveau callback à chaque render
  // parent recrée l'observer (deps churn). Pattern standard pour les
  // callbacks-in-effect.
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onRevealRef.current = onReveal;
  });

  useEffect(() => {
    if (revealed || !ref.current) {
      return;
    }
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          onRevealRef.current?.();
          observer.disconnect();
        }
      },
      { threshold: THRESHOLD }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed]);

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
