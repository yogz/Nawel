"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { mockEvent, type MockSection } from "../_mock";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Vraie palette CoList : fond clair lavande/crème, halos violets doux + pointe
// pêche, encre violet très foncé, accent violet vibrant. Doux, pas saturé.
const CANVAS = `
  radial-gradient(115% 70% at 0% 0%, rgba(168,85,247,0.16), transparent 60%),
  radial-gradient(110% 65% at 100% 22%, rgba(245,226,216,0.85), transparent 55%),
  radial-gradient(120% 80% at 50% 100%, rgba(200,160,255,0.20), transparent 60%),
  linear-gradient(180deg, #FBF9FE 0%, #F6F1FB 100%)`;

const INK = "#2A0B3F"; // titres
const SOFT = "#6E5C88"; // texte secondaire
const FADE = "#AC9EC6"; // réglé / désélectionné
const ACCENT = "#A855F7"; // violet CoList — « à faire / à toi »
const FOCUS =
  "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF9FE]";

const CSS = `
@media (prefers-reduced-motion: no-preference){
  @keyframes v2Node { 0%,100%{ transform:translate(-50%,0) scale(1); opacity:.92 } 50%{ transform:translate(-50%,0) scale(1.22); opacity:1 } }
  .v2-pulse { animation: v2Node 2.8s ease-in-out infinite; }
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
      className={`${jakarta.className} relative min-h-screen overflow-hidden bg-[#FBF9FE]`}
      style={{ color: INK }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Toile claire CoList */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: CANVAS }} />

      {/* Titre sticky — fond clair opaque, fine ombre, ne recouvre rien illisiblement */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Remonter en haut de la page"
        className={`${FOCUS} fixed inset-x-0 top-0 z-50 flex min-h-[44px] items-end px-6 pb-3 pt-12 text-left shadow-[0_8px_24px_-12px_rgba(42,11,63,0.25)] motion-safe:transition-all motion-safe:duration-300 ${
          scrolled ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ background: "rgba(251,249,254,0.92)", backdropFilter: "blur(8px)" }}
      >
        <span className="block w-full truncate text-[20px] font-extrabold tracking-tight">
          {e.title}
        </span>
      </button>

      <div className="relative z-10 mx-auto max-w-[460px] px-6">
        {/* HERO */}
        <header className="pt-20">
          <div
            className="text-[12px] font-bold uppercase tracking-[0.22em]"
            style={{ color: ACCENT }}
          >
            {e.date} · {e.countdown}
          </div>
          <h1 className="mt-3 text-[44px] font-extrabold leading-[1.0] tracking-tight">
            {e.title}
          </h1>
          <p className="mt-3 text-[15px] font-semibold" style={{ color: SOFT }}>
            {e.time} · {e.place}
          </p>

          {/* Avatars */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {e.guests.map((g) => (
                <span
                  key={g.initial}
                  role="img"
                  aria-label={g.name}
                  className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold shadow-[0_2px_8px_rgba(42,11,63,0.18)] ring-2 ring-white"
                  style={{ background: g.bg, color: g.fg }}
                >
                  <span aria-hidden>{g.initial}</span>
                </span>
              ))}
            </div>
            <span className="text-[14px] font-semibold" style={{ color: SOFT }}>
              {e.guestCount} viennent
            </span>
          </div>

          {/* RSVP explicite : les 3 réponses visibles, la tienne en accent */}
          <div role="radiogroup" aria-label="Ta réponse" className="mt-9">
            <div
              className="mb-2 text-[12px] font-bold uppercase tracking-[0.2em]"
              style={{ color: SOFT }}
            >
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
                    className={`${FOCUS} flex min-h-[44px] items-center text-[22px] font-extrabold tracking-tight motion-safe:transition-colors`}
                    style={{ color: on ? ACCENT : FADE }}
                  >
                    {label}
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
            <span className="text-[15px] leading-relaxed" style={{ color: SOFT }}>
              Il manque encore {e.missing} —{" "}
              <span
                className="font-extrabold underline decoration-2 underline-offset-[6px]"
                style={{ color: ACCENT }}
              >
                {onlyFree ? "tout afficher" : "voir ce qui est libre"}
              </span>
            </span>
          </button>
        </header>

        {/* LE MENU — fil de progression à gauche, état par mot + accent + force d'encre */}
        <div className="relative mt-12 pb-44">
          <div
            className="pointer-events-none absolute bottom-2 left-[9px] top-2 w-[2px] rounded-full"
            style={{
              background: `linear-gradient(180deg, ${ACCENT} 0%, ${ACCENT} ${pct}%, rgba(42,11,63,0.12) ${pct}%, rgba(42,11,63,0.12) 100%)`,
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
                <div className="relative mb-5 pl-8">
                  <span
                    className="absolute left-[9px] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ background: FADE }}
                  />
                  <h2
                    className="text-[12px] font-bold uppercase tracking-[0.24em]"
                    style={{ color: SOFT }}
                  >
                    {section.name}
                  </h2>
                </div>

                <div className="space-y-6">
                  {rows.map(({ it, status }) => {
                    const free = status === "free";
                    const isMine = status === "mine";
                    const ownerLabel = isMine ? "à toi" : it.by?.name;
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
                          className={`absolute left-[9px] top-[11px] h-3 w-3 -translate-x-1/2 rounded-full ${free ? "v2-pulse" : ""}`}
                          style={
                            free
                              ? { background: "#FBF9FE", boxShadow: `0 0 0 2px ${ACCENT}` }
                              : isMine
                                ? { background: ACCENT, boxShadow: `0 0 10px ${ACCENT}88` }
                                : { background: FADE }
                          }
                        />
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className="font-extrabold tracking-tight"
                            style={{
                              color: isMine ? ACCENT : free ? INK : FADE,
                              fontSize: free || isMine ? 23 : 20,
                            }}
                          >
                            {it.name}
                          </span>
                          {/* Repère d'ÉTAT lexical (indépendant de la couleur seule) */}
                          <span
                            aria-hidden
                            className="shrink-0 whitespace-nowrap text-[13px] font-bold uppercase tracking-wide"
                            style={{ color: free || isMine ? ACCENT : SOFT }}
                          >
                            {free ? "Prendre →" : isMine ? "✓ À toi" : `✓ ${ownerLabel}`}
                          </span>
                        </div>
                        <div className="mt-1 text-[13px] font-medium" style={{ color: SOFT }}>
                          {free
                            ? "Personne encore"
                            : isMine
                              ? "Tu t'en charges"
                              : `${it.by?.name} l'apporte`}
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

      {/* Courses — poignée, toute la zone cliquable (≥44px), fond clair opaque */}
      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{ background: "linear-gradient(0deg,#FBF9FE 62%,rgba(251,249,254,0))" }}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          className={`${FOCUS} mx-auto flex min-h-[56px] w-full max-w-[460px] flex-col items-center justify-center px-6 pb-7 pt-4`}
        >
          <span aria-hidden className="mb-2 h-1 w-10 rounded-full" style={{ background: FADE }} />
          <span className="text-[16px] font-extrabold tracking-tight" style={{ color: INK }}>
            Ma liste de courses ↑
          </span>
        </button>
      </div>
    </div>
  );
}
