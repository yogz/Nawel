"use client";

import { useRef } from "react";
import { Share2, X } from "lucide-react";

type Props = {
  outingTitle: string;
  outingUrl: string;
  date: Date | null;
  userName: string;
  onClose: () => void;
};

const MONTH_FR = [
  "janv.",
  "févr.",
  "mars",
  "avril",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatTicketDate(date: Date | null): string {
  if (!date) {
    return "Bientôt";
  }
  return `${date.getDate()} ${MONTH_FR[date.getMonth()] ?? ""} · ${String(date.getHours()).padStart(2, "0")}h${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Celebratory overlay shown once a participant has confirmed attendance.
 * Renders a ticket-stub card (perforated edge, barcode strip, rotated
 * slightly) with the attendee's name + outing date. Share button uses
 * the Web Share API when available, clipboard fallback otherwise.
 *
 * Design draws on Dice's gig tickets and Partiful's RSVP confirm —
 * physical-feeling artifact the user can screenshot / story-share.
 */
export function RsvpStub({ outingTitle, outingUrl, date, userName, onClose }: Props) {
  const stubRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    const text = `J'en suis pour ${outingTitle} — ${formatTicketDate(date)}`;
    const shareData = { title: outingTitle, text, url: outingUrl };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User aborted or unsupported — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${outingUrl}`);
    } catch {
      /* no-op */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-encre-700/70 px-6 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute top-6 right-6 grid size-10 place-items-center rounded-full bg-white/90 text-encre-700 transition-colors hover:bg-white"
      >
        <X size={18} />
      </button>

      <div
        ref={stubRef}
        className="relative w-full max-w-[340px] rotate-[-3deg] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FAF7F2] via-white to-[#D7E0FF] p-6 shadow-[0_40px_80px_-20px_rgba(12,18,40,0.5),0_16px_32px_-12px_rgba(45,91,255,0.3)]"
        style={{
          animation: "rsvp-stub-pop 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* Perforation: two semicircle notches + dashed line, purely CSS */}
        <div className="pointer-events-none absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-encre-700/70" />
        <div className="pointer-events-none absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-encre-700/70" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 left-4 h-0 -translate-y-1/2 border-t-2 border-dashed border-encre-200"
        />

        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-bordeaux-700">
          Confirmé
        </p>
        <h2 className="mt-3 text-3xl leading-[0.98] font-black tracking-tight text-encre-700">
          {outingTitle}
        </h2>
        <p className="mt-2 text-sm font-semibold text-encre-500">{formatTicketDate(date)}</p>

        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-encre-400">
              Sortie de
            </p>
            <p className="mt-0.5 text-xl font-black text-encre-700">{userName}</p>
          </div>
          {/* Barcode — repeating stripes via background-image gradient. Pure
              aesthetic, doesn't encode anything. */}
          <div
            aria-hidden="true"
            className="h-10 w-24"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #FF6B4A 0, #FF6B4A 2px, transparent 2px, transparent 4px, #FF6B4A 4px, #FF6B4A 5px, transparent 5px, transparent 8px)",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-encre-700 shadow-[var(--shadow-lg)] transition-transform motion-safe:active:scale-95"
      >
        <Share2 size={16} />
        Partager
      </button>

      <style jsx>{`
        @keyframes rsvp-stub-pop {
          0% {
            transform: translateY(60px) rotate(-8deg) scale(0.9);
            opacity: 0;
          }
          60% {
            transform: translateY(-4px) rotate(-2deg) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateY(0) rotate(-3deg) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
