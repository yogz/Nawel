"use client";

import { useEffect, useRef, useState } from "react";
import { sendGAEvent } from "@/lib/umami";
import { LANDING_EVENTS } from "./landing-events";

type Props = {
  children: React.ReactNode;
  /**
   * Si défini, fire `LANDING_EVENTS.sectionVisible` avec ce nom de
   * section quand l'élément entre dans le viewport. Passer une string
   * (au lieu d'une callback) garde le parent serializable côté RSC.
   */
  eventName?: string;
  className?: string;
};

const THRESHOLD = 0.4;

export function RevealOnScroll({ children, eventName, className = "" }: Props) {
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
          if (eventName) {
            sendGAEvent("event", LANDING_EVENTS.sectionVisible, { section: eventName });
          }
          observer.disconnect();
        }
      },
      { threshold: THRESHOLD }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, eventName]);

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
