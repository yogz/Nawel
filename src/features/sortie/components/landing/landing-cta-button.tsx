"use client";

import Link from "next/link";
import { sendGAEvent } from "@/lib/umami";
import { LANDING_EVENTS, type LandingPosition } from "./landing-events";

type Props = {
  position: LandingPosition;
  fullWidthOnMobile?: boolean;
};

/**
 * CTA "Lancer une sortie" partagé entre le hero et le bottom de la
 * landing. Le `position` driveue le payload Umami pour distinguer les
 * 2 emplacements de clic dans le funnel.
 */
export function LandingCtaButton({ position, fullWidthOnMobile = false }: Props) {
  const widthClass = fullWidthOnMobile ? "w-full justify-center sm:w-auto" : "";
  return (
    <Link
      href="/nouvelle"
      onClick={() => sendGAEvent("event", LANDING_EVENTS.ctaClick, { position })}
      className={`group inline-flex items-center gap-2 rounded-full bg-acid-600 px-7 py-4 text-[17px] font-black text-ink-50 shadow-[var(--shadow-acid)] transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.02] motion-safe:active:scale-[0.98] ${widthClass}`}
      style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
    >
      Lancer une sortie
      <span
        aria-hidden
        className="transition-transform [transition-duration:var(--dur-base)] group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
