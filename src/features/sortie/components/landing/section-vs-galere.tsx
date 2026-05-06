"use client";

import { Check } from "lucide-react";
import { sendGAEvent } from "@/lib/umami";
import { LANDING_EVENTS } from "./landing-events";
import { RevealOnScroll } from "./reveal-on-scroll";

// Grille Doodle mock : 6 personnes × 8 dates, taux de "oui" volontairement
// éclaté pour qu'aucune colonne ne fasse l'unanimité — le tableau dit
// "personne n'a coché la même" sans avoir besoin du caption pour le voir.
const DOODLE_PEOPLE = ["jules", "lou", "nina", "sam", "tom", "zoé"];
// 6 lignes × 8 colonnes (48 cells). 1 = oui, 0 = vide. Choisi à la main
// pour qu'aucune colonne n'atteigne 6/6 : la colonne max est 3/6.
const DOODLE_GRID: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 0, 0, 1, 0, 1, 0, 0],
  [0, 1, 0, 0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
];

/**
 * Comparaison visuelle Doodle vs Sortie. Tongue-in-cheek par le contraste
 * (petit gris désaturé vs gros acid), pas par le texte. Pas de tableau
 * comparatif corporate — montrer, pas dire. Anti-pattern explicite :
 * pas de "comparison table" genre B2B SaaS.
 */
export function SectionVsGalere() {
  return (
    <RevealOnScroll
      onReveal={() => sendGAEvent("event", LANDING_EVENTS.sectionVisible, { section: "vs-galere" })}
      className="mt-20 sm:mt-24"
    >
      <section className="px-6">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ la différence ─
        </p>
        <h2
          className="mb-10 font-display text-[34px] leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl"
          style={{ textWrap: "balance" }}
        >
          Aligner 8 personnes,
          <br />
          <span className="text-acid-600">en 1 tap.</span>
        </h2>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_1.4fr] sm:items-center sm:gap-8">
          {/* Doodle mock — petit, gris, désaturé. Non interactif. */}
          <div aria-hidden className="opacity-60">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
              ─ doodle ─
            </p>
            <div className="rounded-md border border-surface-400 bg-surface-100 p-3">
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `64px repeat(${DOODLE_GRID[0]?.length ?? 0}, 14px)` }}
              >
                <div />
                {Array.from({ length: DOODLE_GRID[0]?.length ?? 0 }).map((_, i) => (
                  <div key={`h-${i}`} className="text-center font-mono text-[8px] text-ink-400">
                    {i + 1}
                  </div>
                ))}
                {DOODLE_GRID.map((row, r) => (
                  <div key={`row-${r}`} className="contents">
                    <div className="truncate font-mono text-[10px] text-ink-500">
                      {DOODLE_PEOPLE[r]}
                    </div>
                    {row.map((cell, c) => (
                      <div
                        key={`c-${r}-${c}`}
                        className={`h-[14px] w-[14px] rounded-[2px] ${
                          cell ? "bg-ink-400" : "bg-surface-200"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">
              personne n&rsquo;a coché la même
            </p>
          </div>

          {/* Sortie mock — gros, acid, vivant. */}
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600">
              ─ sortie ─
            </p>
            <div className="rounded-[20px] border border-acid-600/40 bg-surface-50 p-5 shadow-[0_0_30px_rgba(199,255,60,0.12)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600">
                jeu. 12 déc. · 20h30
              </p>
              <p
                className="mt-2 font-display text-[32px] leading-[0.95] font-black tracking-[-0.03em] text-ink-700"
                style={{ textWrap: "balance" }}
              >
                6 oui. mardi.
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {["jules", "lou", "nina", "sam", "tom", "zoé"].map((name) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-acid-600/15 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-acid-700"
                  >
                    <Check size={10} strokeWidth={2.6} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-500">
              tous d&rsquo;accord. en 1 tap.
            </p>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
