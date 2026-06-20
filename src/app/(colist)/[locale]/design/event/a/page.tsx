"use client";

import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { mockEvent, type MockPerson } from "../_mock";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const GRAD = "linear-gradient(150deg,#7C3AED 0%,#A855F7 45%,#EC4899 100%)";

function Avatar({ person, size = 36 }: { person: MockPerson; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white"
      style={{
        width: size,
        height: size,
        background: person.bg,
        color: person.fg,
        fontSize: size * 0.36,
      }}
    >
      {person.initial}
    </span>
  );
}

/**
 * Labo de design — Variante A « Convivial ».
 * Page figée (fausses données) : refonte radicale de la page d'événement,
 * en fil unique orienté action invité. Aucune logique réelle branchée.
 *
 * Le titre se condense en barre sticky en haut dès qu'on fait défiler.
 */
export default function DesignEventVariantA() {
  const e = mockEvent;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 150);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`${jakarta.className} min-h-screen bg-[#F6F4FB] pb-32 text-[#16121F]`}>
      {/* Sticky condensed header — apparaît au scroll */}
      <div
        className={`fixed inset-x-0 top-0 z-50 text-white motion-safe:transition-all motion-safe:duration-300 ${
          scrolled ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
        style={{ background: GRAD }}
      >
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-4 pb-3 pt-12">
          <button
            type="button"
            aria-label="Retour"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
          >
            ←
          </button>
          <span className="flex-1 truncate text-[17px] font-extrabold tracking-tight">
            {e.title}
          </span>
          <button
            type="button"
            aria-label="Options"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
          >
            •••
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[430px]">
        {/* HERO */}
        <div
          className="relative overflow-hidden rounded-b-[34px] px-5 pb-7 pt-14 text-white"
          style={{ background: GRAD }}
        >
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute right-16 top-20 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              aria-label="Retour"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Options"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            >
              •••
            </button>
          </div>
          <div className="relative mt-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold">
              🔥 {e.countdown}
            </div>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight">
              {e.title}
            </h1>
            <p className="mt-2 text-[15px] font-medium text-white/85">
              {e.date} · {e.time} · {e.place}
            </p>
            <div className="mt-5 flex items-center">
              <div className="flex -space-x-3">
                {e.guests.map((g) => (
                  <Avatar key={g.initial} person={g} />
                ))}
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/30 text-[12px] font-bold text-white ring-2 ring-white">
                  +{e.guestCount - e.guests.length}
                </span>
              </div>
              <span className="ml-3 text-[14px] font-semibold text-white/90">
                {e.guestCount} viennent
              </span>
            </div>
          </div>
        </div>

        {/* RSVP */}
        <div className="relative -mt-5 px-4">
          <div className="flex rounded-2xl bg-white p-1.5 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.35)]">
            <button
              type="button"
              className="flex-1 rounded-xl bg-[#7C3AED] py-3 text-[14px] font-bold text-white"
            >
              Je viens ✓
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl py-3 text-[14px] font-semibold text-[#6B6480]"
            >
              Peut-être
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl py-3 text-[14px] font-semibold text-[#6B6480]"
            >
              Non
            </button>
          </div>
        </div>

        {/* AI nudge */}
        <div className="mt-4 px-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
            <div className="text-xl">✨</div>
            <div className="text-[13px] leading-snug text-[#9A3412]">
              <span className="font-bold">Il manque encore</span> {e.missing}. Un·e
              volontaire&nbsp;?
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex gap-2 px-4 text-[13px] font-semibold">
          <button type="button" className="rounded-full bg-[#16121F] px-4 py-1.5 text-white">
            Tout
          </button>
          <button type="button" className="rounded-full bg-white px-4 py-1.5 text-[#6B6480]">
            À prendre <span className="ml-1 text-[#EC4899]">3</span>
          </button>
          <button type="button" className="rounded-full bg-white px-4 py-1.5 text-[#6B6480]">
            Ma part
          </button>
        </div>

        {/* FEED */}
        <div className="mt-3 space-y-3 px-4">
          {e.sections.map((section) => (
            <div key={section.name} className="space-y-3">
              <div className="mt-2 text-[12px] font-bold uppercase tracking-wider text-[#A39DB5]">
                {section.emoji} {section.name}
              </div>
              {section.items.map((item) =>
                item.by ? (
                  <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                    <div className="flex-1">
                      <div className="text-[16px] font-bold">{item.name}</div>
                      <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[#6B6480]">
                        <Avatar person={item.by} size={24} />
                        {item.by.name} l&apos;apporte
                      </div>
                    </div>
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[#DCFCE7] text-sm text-[#16A34A]">
                      ✓
                    </div>
                  </div>
                ) : (
                  <div key={item.name} className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[16px] font-bold">{item.name}</div>
                      <span className="rounded-full bg-[#FCE7F3] px-2 py-0.5 text-[11px] font-bold text-[#EC4899]">
                        LIBRE
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl py-3 text-[15px] font-bold text-white"
                      style={{ background: GRAD }}
                    >
                      Je prends 🙌
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <div className="pointer-events-none fixed bottom-7 left-1/2 flex w-full max-w-[430px] -translate-x-1/2 justify-end px-4">
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#16121F] py-4 pl-5 pr-6 text-[15px] font-bold text-white shadow-2xl"
        >
          🛒 Ma liste
        </button>
      </div>
    </div>
  );
}
