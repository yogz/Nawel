import confetti from "canvas-confetti";

const ACID_COLORS = ["#C7FF3C", "#FF3D81", "#F5F2EB"];

function originFromElement(el: HTMLElement | null | undefined): { x: number; y: number } {
  if (!el || typeof window === "undefined") {
    return { x: 0.5, y: 0.6 };
  }
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  return { x: clamp01(x), y: clamp01(y) };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, n));
}

/**
 * Fired only on hard-yes RSVPs. Two short bursts so the canvas footprint
 * stays small (≤ 30 particles total). Reduced-motion preference is
 * honoured natively by canvas-confetti via the disable flag.
 */
export function celebrateRsvp(originEl?: HTMLElement | null): void {
  const origin = originFromElement(originEl);
  const shared = {
    origin,
    colors: ACID_COLORS,
    disableForReducedMotion: true,
    zIndex: 60,
  } as const;

  void confetti({
    ...shared,
    particleCount: 22,
    spread: 60,
    startVelocity: 28,
    scalar: 0.8,
    ticks: 90,
  });

  window.setTimeout(() => {
    void confetti({
      ...shared,
      particleCount: 8,
      spread: 90,
      startVelocity: 22,
      scalar: 0.6,
      ticks: 70,
      shapes: ["circle"],
    });
  }, 80);
}
