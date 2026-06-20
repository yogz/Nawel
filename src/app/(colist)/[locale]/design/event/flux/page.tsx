"use client";

import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { mockEvent, type MockItem, type MockSection } from "../_mock";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// La toile : un seul dégradé profond qui respire. Pas de cartes, pas de bords.
const CANVAS =
  "linear-gradient(165deg,#190536 0%,#2A0A52 14%,#5B21B6 32%,#7C3AED 48%,#A21CAF 67%,#DB2777 84%,#220746 100%)";

const CSS = `
.flux-glow { text-shadow: 0 2px 24px rgba(0,0,0,.38), 0 0 26px rgba(255,255,255,.10); }
.flux-soft { text-shadow: 0 1px 16px rgba(0,0,0,.45); }
@media (prefers-reduced-motion: no-preference){
  @keyframes fluxDrift { 0%,100%{ background-position:50% 0% } 50%{ background-position:50% 100% } }
  @keyframes fluxBlob  { 0%,100%{ transform:translate(0,0) scale(1) } 50%{ transform:translate(6%, -4%) scale(1.12) } }
  @keyframes fluxLive  { 0%,100%{ opacity:.92; filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) } 50%{ opacity:1; filter:drop-shadow(0 0 16px rgba(255,255,255,.95)) } }
  .flux-canvas { animation: fluxDrift 18s ease-in-out infinite; }
  .flux-b1 { animation: fluxBlob 22s ease-in-out infinite; }
  .flux-b2 { animation: fluxBlob 26s ease-in-out infinite reverse; }
  .flux-live { animation: fluxLive 3.2s ease-in-out infinite; }
}
`;

const RSVP_STATES = ["J'y serai", "Peut-être", "Je ne peux pas"];

export default function DesignEventFlux() {
  const e = mockEvent;
  const [scrolled, setScrolled] = useState(false);
  const [rsvp, setRsvp] = useState(0);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 170);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const toggleClaim = (name: string) =>
    setClaimed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div
      className={`${jakarta.className} relative min-h-screen overflow-hidden bg-[#190536] text-white`}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Toile vivante (fixe, respire) — au-dessus du fond clair du layout */}
      <div
        className="flux-canvas fixed inset-0 z-0"
        style={{ background: CANVAS, backgroundSize: "100% 150%" }}
      />
      {/* Scrim sombre en haut : garantit la lisibilité du hero sans bord visible */}
      <div
        className="fixed inset-x-0 top-0 z-0 h-[340px]"
        style={{ background: "linear-gradient(180deg, rgba(20,5,40,.7) 0%, rgba(20,5,40,0) 100%)" }}
      />
      {/* Halos de lumière qui dérivent (placés bas pour ne pas délaver le hero) */}
      <div className="flux-b1 fixed -left-24 top-1/2 z-0 h-80 w-80 rounded-full bg-[#F0ABFC]/15 blur-[90px]" />
      <div className="flux-b2 fixed -right-20 bottom-10 z-0 h-96 w-96 rounded-full bg-[#7C3AED]/30 blur-[100px]" />
      {/* Fil de lumière — le continuum */}
      <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-full w-px -translate-x-[150px] bg-gradient-to-b from-transparent via-white/25 to-transparent blur-[0.5px]" />

      {/* Titre qui se re-matérialise au scroll — sans barre, juste un fondu */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Remonter en haut de la page"
        className={`fixed inset-x-0 top-0 z-50 px-6 pb-4 pt-12 text-left motion-safe:transition-all motion-safe:duration-500 ${
          scrolled ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "linear-gradient(180deg, rgba(42,10,82,.85), rgba(42,10,82,0))" }}
      >
        <span className="flux-glow block truncate text-[22px] font-extrabold tracking-tight">
          {e.title}
        </span>
      </button>

      {/* CONTENU — flotte directement sur la toile */}
      <div className="relative z-10 mx-auto max-w-[430px] px-7">
        {/* Hero */}
        <header className="pt-20">
          <div className="flux-soft text-[12px] font-semibold uppercase tracking-[0.25em] text-white/70">
            {e.date} · {e.countdown}
          </div>
          <h1 className="flux-glow mt-4 text-[46px] font-extrabold leading-[0.98] tracking-tight">
            {e.title}
          </h1>
          <p className="flux-soft mt-4 text-[15px] font-medium text-white/75">
            {e.time} · {e.place}
          </p>

          {/* Avatars = orbes lumineux, sans contour dur */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {e.guests.map((g) => (
                <span
                  key={g.initial}
                  className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold"
                  style={{
                    background: g.bg,
                    color: g.fg,
                    boxShadow: "0 0 18px rgba(255,255,255,.35)",
                  }}
                >
                  {g.initial}
                </span>
              ))}
            </div>
            <span className="flux-soft text-[14px] font-medium text-white/75">
              {e.guestCount} viennent
            </span>
          </div>

          {/* RSVP = un seul mot lumineux, qu'on touche */}
          <button
            type="button"
            onClick={() => setRsvp((r) => (r + 1) % RSVP_STATES.length)}
            className="mt-8 block text-left"
          >
            <span className="flux-soft text-[14px] text-white/60">Toi&nbsp;?&nbsp;&nbsp;</span>
            <span className="flux-live text-[26px] font-extrabold tracking-tight">
              {RSVP_STATES[rsvp]}
            </span>
          </button>

          {/* « Il manque » = un murmure, pas une carte */}
          <p className="flux-soft mt-8 text-[15px] leading-relaxed text-white/70">
            Il manque encore {e.missing} —{" "}
            <span className="flux-glow font-bold text-white underline decoration-white/40 decoration-2 underline-offset-[6px]">
              tu t&apos;en charges&nbsp;?
            </span>
          </p>
        </header>

        {/* Le menu — pas de titres de section, juste le souffle, la teinte et le fil */}
        <div className="mt-14 space-y-12 pb-44">
          {e.sections.map((section: MockSection) => (
            <section key={section.name} className="relative">
              {/* mot-fantôme de la section, en filigrane */}
              <div
                className="pointer-events-none absolute -left-1 -top-9 select-none text-[64px] font-extrabold uppercase tracking-tight text-white/[0.06]"
                aria-hidden
              >
                {section.name}
              </div>
              <div className="relative space-y-7">
                {section.items.map((item: MockItem) => {
                  const isClaimedByYou = claimed.has(item.name);
                  const taken = !!item.by || isClaimedByYou;
                  const helper = isClaimedByYou ? "Toi" : item.by?.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => !item.by && toggleClaim(item.name)}
                      className="block w-full text-left"
                    >
                      <div className="flex items-baseline gap-3">
                        {/* nœud sur le fil */}
                        <span
                          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${taken ? "bg-white/40" : "flux-live bg-white"}`}
                        />
                        <div className="min-w-0">
                          <div
                            className={
                              taken
                                ? "flux-soft text-[21px] font-bold text-white/55"
                                : "flux-glow text-[24px] font-extrabold text-white"
                            }
                          >
                            {item.name}
                            {taken && (
                              <span className="ml-2 align-middle text-[15px] text-white/70">✓</span>
                            )}
                          </div>
                          <div className="flux-soft mt-1 text-[13px] text-white/55">
                            {taken
                              ? `${helper} l'apporte`
                              : "personne encore — touche pour prendre"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Courses = une remontée lumineuse depuis le bas, pas un bouton-boîte */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-center pb-7 pt-10"
        style={{ background: "linear-gradient(0deg, rgba(42,10,82,.9) 20%, rgba(42,10,82,0))" }}
      >
        <div className="h-1 w-10 rounded-full bg-white/45" />
        <button
          type="button"
          className="flux-glow mt-3 text-[16px] font-bold tracking-tight text-white"
        >
          Ma liste de courses ↑
        </button>
      </div>
    </div>
  );
}
