"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { mockEvent, type MockSection } from "../_mock";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Toile profonde : la famille de couleurs est gardée, mais assez sombre pour que
// le texte blanc soit lisible PARTOUT (y compris au soleil). Contraste d'abord.
const CANVAS =
  "linear-gradient(162deg,#140427 0%,#36096A 24%,#561690 42%,#7A1E8F 60%,#9D1C6E 80%,#2E0846 100%)";

const WARM = "#FFC15E"; // température « à faire / à toi »
const FOCUS =
  "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0633]";

const CSS = `
.v2-glow { text-shadow: 0 1px 2px rgba(10,2,22,.9), 0 0 18px rgba(0,0,0,.5); }
@media (prefers-reduced-motion: no-preference){
  @keyframes v2Drift { 0%,100%{ background-position:50% 0% } 50%{ background-position:50% 100% } }
  @keyframes v2Node  { 0%,100%{ transform:translate(-50%,0) scale(1); opacity:.9 } 50%{ transform:translate(-50%,0) scale(1.22); opacity:1 } }
  .v2-canvas { animation: v2Drift 22s ease-in-out infinite; }
  .v2-pulse  { animation: v2Node 2.8s ease-in-out infinite; }
}
`;

const RSVP = ["J'y serai", "Peut-être", "Je ne peux pas"];

type Status = "free" | "taken" | "mine";

export default function DesignEventFluxV2() {
  const e = mockEvent;
  const [scrolled, setScrolled] = useState(false);
  const [rsvp, setRsvp] = useState(0);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [onlyFree, setOnlyFree] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 150);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const statusOf = (name: string, takenByOther: boolean): Status =>
    mine.has(name) ? "mine" : takenByOther ? "taken" : "free";

  const toggleMine = (name: string) =>
    setMine((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

  // Progression = part des plats réglés (pris par quelqu'un ou par moi).
  const { settled, total } = useMemo(() => {
    let s = 0;
    let t = 0;
    for (const section of e.sections as MockSection[]) {
      for (const it of section.items) {
        t += 1;
        if (it.by || mine.has(it.name)) {
          s += 1;
        }
      }
    }
    return { settled: s, total: t };
  }, [e.sections, mine]);
  const pct = Math.round((settled / total) * 100);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      className={`${jakarta.className} relative min-h-screen overflow-hidden bg-[#140427] text-white`}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Toile vivante + voile de lisibilité (garantit le contraste partout) */}
      <div
        className="v2-canvas pointer-events-none fixed inset-0 z-0"
        style={{ background: CANVAS, backgroundSize: "100% 160%" }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-black/25" />
      <div className="pointer-events-none fixed -right-24 top-10 z-0 h-80 w-80 rounded-full bg-[#FF9E55]/10 blur-[110px]" />

      {/* Titre sticky — fond OPAQUE pour ne jamais recouvrir illisiblement le contenu */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Remonter en haut de la page"
        className={`${FOCUS} fixed inset-x-0 top-0 z-50 flex min-h-[44px] items-end px-6 pb-3 pt-12 text-left motion-safe:transition-all motion-safe:duration-300 ${
          scrolled ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ background: "#1a0535" }}
      >
        <span className="v2-glow block w-full truncate text-[20px] font-extrabold tracking-tight">
          {e.title}
        </span>
      </button>

      <div className="relative z-10 mx-auto max-w-[460px] px-6">
        {/* HERO */}
        <header className="pt-20">
          <div className="v2-glow text-[12px] font-bold uppercase tracking-[0.22em] text-white/85">
            {e.date} · {e.countdown}
          </div>
          <h1 className="v2-glow mt-3 text-[44px] font-extrabold leading-[1.0] tracking-tight">
            {e.title}
          </h1>
          <p className="v2-glow mt-3 text-[15px] font-semibold text-white/85">
            {e.time} · {e.place}
          </p>

          {/* Avatars (prénoms exposés aux lecteurs d'écran) */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {e.guests.map((g) => (
                <span
                  key={g.initial}
                  role="img"
                  aria-label={g.name}
                  className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold"
                  style={{
                    background: g.bg,
                    color: g.fg,
                    boxShadow: "0 0 16px rgba(255,255,255,.3)",
                  }}
                >
                  <span aria-hidden>{g.initial}</span>
                </span>
              ))}
            </div>
            <span className="v2-glow text-[14px] font-semibold text-white/85">
              {e.guestCount} viennent
            </span>
          </div>

          {/* RSVP explicite : les 3 réponses visibles, la tienne illuminée */}
          <div role="radiogroup" aria-label="Ta réponse" className="mt-9">
            <div className="v2-glow mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white/60">
              Tu y seras ?
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {RSVP.map((label, i) => {
                const on = rsvp === i;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRsvp(i)}
                    className={`${FOCUS} flex min-h-[44px] items-center text-[22px] font-extrabold tracking-tight motion-safe:transition-all`}
                    style={on ? { color: WARM, textShadow: `0 0 22px ${WARM}66` } : undefined}
                  >
                    <span className={on ? "v2-glow" : "v2-glow text-white/40"}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* « Il manque » devient un FILTRE actionnable */}
          <button
            type="button"
            onClick={() => setOnlyFree((f) => !f)}
            aria-pressed={onlyFree}
            className={`${FOCUS} mt-9 flex min-h-[44px] w-full items-center text-left`}
          >
            <span className="v2-glow text-[15px] leading-relaxed text-white/85">
              Il manque encore {e.missing} —{" "}
              <span
                className="font-extrabold underline decoration-2 underline-offset-[6px]"
                style={{ color: WARM }}
              >
                {onlyFree ? "tout afficher" : "voir ce qui est libre"}
              </span>
            </span>
          </button>
        </header>

        {/* LE MENU — fil de progression à gauche, états par mot + température + lumière */}
        <div className="relative mt-12 pb-44">
          {/* Le fil : rempli (chaud) du haut jusqu'à la progression, éteint en dessous */}
          <div
            className="pointer-events-none absolute bottom-2 left-[9px] top-2 w-[2px] rounded-full"
            style={{
              background: `linear-gradient(180deg, ${WARM} 0%, ${WARM} ${pct}%, rgba(255,255,255,.14) ${pct}%, rgba(255,255,255,.14) 100%)`,
            }}
          />

          {(e.sections as MockSection[]).map((section) => {
            const rows = section.items
              .map((it) => ({ it, status: statusOf(it.name, !!it.by) }))
              .filter((r) => (onlyFree ? r.status === "free" : true));
            if (rows.length === 0) {
              return null;
            }
            return (
              <section key={section.name} className="mb-11">
                {/* Nom de section : net, lumineux, posé sur le fil (plus de filigrane illisible) */}
                <div className="relative mb-5 pl-8">
                  <span className="absolute left-[9px] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55" />
                  <h2 className="v2-glow text-[12px] font-bold uppercase tracking-[0.24em] text-white/70">
                    {section.name}
                  </h2>
                </div>

                <div className="space-y-6">
                  {rows.map(({ it, status }) => {
                    const free = status === "free";
                    const isMine = status === "mine";
                    const ownerLabel = isMine ? "à toi" : it.by?.name;
                    const stateWord = free ? "Libre" : isMine ? "À toi" : "Pris";
                    const a11yState = free
                      ? "libre, touche pour le prendre"
                      : isMine
                        ? "tu l'apportes, touche pour te retirer"
                        : `pris par ${it.by?.name}`;
                    const Row: React.ElementType = free || isMine ? "button" : "div";
                    return (
                      <Row
                        key={it.name}
                        {...(free || isMine
                          ? {
                              type: "button",
                              onClick: () => toggleMine(it.name),
                              "aria-pressed": isMine,
                            }
                          : { "aria-label": `${it.name}, ${a11yState}` })}
                        className={`${free || isMine ? FOCUS : ""} relative block w-full min-h-[44px] py-1 pl-8 text-left`}
                      >
                        {/* nœud sur le fil */}
                        <span
                          aria-hidden
                          className={`absolute left-[9px] top-[10px] h-3 w-3 -translate-x-1/2 rounded-full ${
                            free ? "v2-pulse ring-2 ring-offset-0" : ""
                          }`}
                          style={
                            free
                              ? {
                                  background: "transparent",
                                  boxShadow: `0 0 0 2px ${WARM}, 0 0 12px ${WARM}`,
                                }
                              : isMine
                                ? { background: WARM, boxShadow: `0 0 12px ${WARM}` }
                                : { background: "rgba(255,255,255,.5)" }
                          }
                        />
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={`v2-glow font-extrabold tracking-tight ${free ? "text-[23px] text-white" : isMine ? "text-[23px]" : "text-[20px] text-white/65"}`}
                            style={isMine ? { color: WARM } : undefined}
                          >
                            {it.name}
                          </span>
                          {/* Repère d'ÉTAT lexical (ne dépend pas que de la lumière) */}
                          <span
                            className="v2-glow shrink-0 whitespace-nowrap text-[13px] font-bold uppercase tracking-wide"
                            style={
                              free || isMine ? { color: WARM } : { color: "rgba(255,255,255,.7)" }
                            }
                            aria-hidden
                          >
                            {free ? "Prendre →" : isMine ? "✓ À toi" : `✓ ${ownerLabel}`}
                          </span>
                        </div>
                        {/* sous-ligne lisible */}
                        <div className="v2-glow mt-1 text-[13px] font-medium text-white/70">
                          {free
                            ? "Personne encore"
                            : isMine
                              ? "Tu t'en charges"
                              : `${it.by?.name} l'apporte`}
                          {!free && <span className="sr-only"> — {stateWord}</span>}
                        </div>
                      </Row>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Courses — poignée lumineuse, toute la zone cliquable (≥44px), fond opaque */}
      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{ background: "linear-gradient(0deg,#160428 62%,rgba(22,4,40,0))" }}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          className={`${FOCUS} mx-auto flex min-h-[56px] w-full max-w-[460px] flex-col items-center justify-center px-6 pb-7 pt-4`}
        >
          <span aria-hidden className="mb-2 h-1 w-10 rounded-full bg-white/50" />
          <span className="v2-glow text-[16px] font-extrabold tracking-tight text-white">
            Ma liste de courses ↑
          </span>
        </button>
      </div>
    </div>
  );
}
