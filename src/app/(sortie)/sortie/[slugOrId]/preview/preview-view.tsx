"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, Share, Sparkles } from "lucide-react";
import { formatRelativeDateForShare, formatTimeOnly } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";

type Confirmed = { id: string; name: string; image: string | null };

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  heroImageUrl: string | null;
  ticketUrl: string | null;
  confirmed: Confirmed[];
  confirmedCount: number;
  interestedCount: number;
  totalHeads: number;
};

const ACID = "#C7FF3C";
const HOT = "#FF3D81";

export function PreviewView(props: Props) {
  return (
    <main
      className="relative min-h-[100dvh] overflow-hidden text-[#F5F2EB]"
      style={{
        background: "#0A0A0A",
        fontFamily: "var(--font-pilot-body), system-ui, sans-serif",
      }}
    >
      <PilotChip />
      <Hero {...props} />
      <GoingStrip {...props} />
      <DetailCard {...props} />
      <BottomCTA confirmedCount={props.confirmedCount} totalHeads={props.totalHeads} />
    </main>
  );
}

function PilotChip() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur-md"
      style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
    >
      <span style={{ color: ACID }}>● </span>
      <span className="text-white/70">pilote design</span>
    </div>
  );
}

function Hero({
  title,
  location,
  startsAt,
  heroImageUrl,
  ticketUrl,
}: Pick<Props, "title" | "location" | "startsAt" | "heroImageUrl" | "ticketUrl">) {
  const prefersReducedMotion = useReducedMotion();
  const dateLine = useMemo(() => {
    if (!startsAt) {
      return "DATE TBD";
    }
    const rel = formatRelativeDateForShare(startsAt).toUpperCase();
    return `${rel} — ${formatTimeOnly(startsAt).toUpperCase()}`;
  }, [startsAt]);

  return (
    <section className="relative h-[78dvh] min-h-[560px] w-full overflow-hidden">
      {heroImageUrl ? (
        // Remote ticket-CDN images. Same trade-off as the main page: not
        // worth whitelisting domains for next/image on a preview route.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: "saturate(1.15) contrast(1.05)",
          }}
        />
      ) : (
        <GradientFallback title={title} />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0) 25%, rgba(10,10,10,0) 55%, rgba(10,10,10,0.95) 100%)",
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <button
          type="button"
          aria-label="Retour"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-md transition-transform active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Partager"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-md transition-transform active:scale-95"
        >
          <Share size={18} strokeWidth={2.2} />
        </button>
      </nav>

      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8">
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 inline-flex items-center gap-2 text-[10.5px] tracking-[0.22em]"
          style={{
            fontFamily: "var(--font-pilot-mono), ui-monospace, monospace",
            color: ACID,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: ACID, boxShadow: `0 0 12px ${ACID}` }}
          />
          {dateLine}
        </motion.p>

        <motion.h1
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="font-black leading-[0.92] tracking-[-0.04em]"
          style={{
            fontFamily: "var(--font-pilot-display), system-ui, sans-serif",
            fontSize: "clamp(44px, 11vw, 72px)",
            textWrap: "balance",
          }}
        >
          {title}
        </motion.h1>

        {location && (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="mt-4 text-[13px] uppercase tracking-[0.18em] text-white/65"
            style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
          >
            ◉ {formatVenue(location)}
          </motion.p>
        )}

        {ticketUrl && (
          <motion.a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            style={{ color: ACID }}
          >
            Billetterie officielle <ArrowUpRight size={14} strokeWidth={2.4} />
          </motion.a>
        )}
      </div>
    </section>
  );
}

function GradientFallback({ title }: { title: string }) {
  const initial = title.trim().charAt(0).toUpperCase() || "S";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${HOT} 0%, transparent 45%), radial-gradient(circle at 80% 80%, ${ACID} 0%, transparent 45%), #1a1a1a`,
      }}
    >
      <span
        className="font-black opacity-30"
        style={{
          fontFamily: "var(--font-pilot-display), system-ui, sans-serif",
          fontSize: "min(60vw, 360px)",
          color: "#0A0A0A",
          mixBlendMode: "overlay",
        }}
      >
        {initial}
      </span>
    </div>
  );
}

function GoingStrip({
  confirmed,
  confirmedCount,
  totalHeads,
  interestedCount,
}: Pick<Props, "confirmed" | "confirmedCount" | "totalHeads" | "interestedCount">) {
  const prefersReducedMotion = useReducedMotion();
  const visible = confirmed.slice(0, 12);

  if (confirmedCount === 0 && interestedCount === 0) {
    return (
      <section className="relative px-5 py-10">
        <p
          className="text-[11px] uppercase tracking-[0.22em] text-white/40"
          style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
        >
          ─ first to commit ─
        </p>
        <p
          className="mt-3 text-[28px] font-extrabold leading-[1] tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-pilot-display), system-ui, sans-serif" }}
        >
          Personne n&rsquo;a encore tappé.
          <br />
          <span style={{ color: ACID }}>Sois la première.</span>
        </p>
      </section>
    );
  }

  return (
    <section className="relative px-5 pb-2 pt-8">
      <div className="flex items-baseline justify-between">
        <p
          className="text-[11px] uppercase tracking-[0.22em] text-white/40"
          style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
        >
          ─ they&rsquo;re in ─
        </p>
        <p
          className="text-[11px] tabular-nums tracking-wider text-white/55"
          style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
        >
          {String(totalHeads).padStart(2, "0")} heads
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex">
          {visible.map((p, i) => (
            <motion.div
              key={p.id}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -8, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                duration: 0.45,
                delay: 0.05 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative -ml-2.5 first:ml-0"
              style={{ zIndex: visible.length - i }}
            >
              <Avatar name={p.name} image={p.image} ringColor={i === 0 ? ACID : "#0A0A0A"} />
            </motion.div>
          ))}
        </div>

        {confirmedCount > visible.length && (
          <span
            className="text-[12px] tabular-nums text-white/55"
            style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
          >
            +{confirmedCount - visible.length}
          </span>
        )}
      </div>

      <p
        className="mt-5 text-[34px] font-black leading-[0.95] tracking-[-0.035em]"
        style={{ fontFamily: "var(--font-pilot-display), system-ui, sans-serif" }}
      >
        <span>{confirmed[0]?.name ?? "Quelqu'un"}</span>
        {confirmedCount > 1 && (
          <>
            {" "}
            <span className="text-white/55">+{confirmedCount - 1}</span>
          </>
        )}
        <br />
        <span style={{ color: ACID }}>are pulling up.</span>
      </p>
    </section>
  );
}

function Avatar({
  name,
  image,
  ringColor,
}: {
  name: string;
  image: string | null;
  ringColor: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-bold"
      style={{
        background: image ? `url(${image}) center/cover` : "#222",
        boxShadow: `0 0 0 3px ${ringColor === "#0A0A0A" ? "#0A0A0A" : ringColor}, 0 0 0 4px rgba(255,255,255,0.06)`,
        color: "#F5F2EB",
        fontFamily: "var(--font-pilot-display), system-ui, sans-serif",
      }}
    >
      {!image && initial}
    </div>
  );
}

function DetailCard({
  startsAt,
  deadlineAt,
  location,
}: Pick<Props, "startsAt" | "deadlineAt" | "location">) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const closesIn = useMemo(() => formatCountdown(deadlineAt, now), [deadlineAt, now]);

  return (
    <section className="relative mx-5 mt-8 mb-32 overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] backdrop-blur-sm">
      <div
        className="border-b border-white/5 px-5 py-4"
        style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">closes in</p>
        <p
          className="mt-1 text-[22px] font-bold tabular-nums tracking-tight"
          style={{ color: HOT }}
        >
          {closesIn}
        </p>
      </div>

      <Row label="when" value={startsAt ? formatLongDate(startsAt) : "TBD"} />
      <Row label="where" value={formatVenue(location) ?? "TBD"} />
      <Row label="who paid" value="—" muted />
    </section>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 px-5 py-4 last:border-b-0">
      <span
        className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-white/45"
        style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
      >
        {label}
      </span>
      <span
        className={`text-right text-[15px] ${muted ? "text-white/40" : "text-white/90"}`}
        style={{ fontFamily: "var(--font-pilot-body), system-ui, sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

function BottomCTA({ confirmedCount, totalHeads }: { confirmedCount: number; totalHeads: number }) {
  const [committed, setCommitted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  function commit() {
    if (committed) {
      return;
    }
    setCommitted(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        background:
          "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.85) 35%, rgba(10,10,10,0.98) 100%)",
        paddingTop: "1.5rem",
      }}
    >
      <div className="mx-auto max-w-xl px-5">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-[0.22em] text-white/45"
            style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
          >
            tap to commit
          </span>
          <span
            className="text-[10px] tabular-nums uppercase tracking-[0.22em] text-white/45"
            style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
          >
            {confirmedCount}/{totalHeads || "?"} in
          </span>
        </div>

        <motion.button
          type="button"
          onClick={commit}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          animate={
            prefersReducedMotion ? undefined : committed ? { scale: [1, 1.02, 1] } : { scale: 1 }
          }
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-[62px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[20px] font-black tracking-tight"
          style={{
            background: committed ? "#1a1a1a" : ACID,
            color: committed ? ACID : "#0A0A0A",
            border: committed ? `1.5px solid ${ACID}` : "none",
            fontFamily: "var(--font-pilot-display), system-ui, sans-serif",
            boxShadow: committed ? "none" : `0 12px 32px -12px ${ACID}`,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {committed ? (
              <motion.span
                key="in"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                <Sparkles size={18} strokeWidth={2.4} fill={ACID} />
                {"you're in."}
              </motion.span>
            ) : (
              <motion.span
                key="prompt"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                I&apos;M IN <Sparkles size={18} strokeWidth={2.4} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <button
          type="button"
          className="mt-2 block w-full py-3 text-center text-[12px] uppercase tracking-[0.22em] text-white/40 transition-colors hover:text-white/70"
          style={{ fontFamily: "var(--font-pilot-mono), ui-monospace, monospace" }}
        >
          can&rsquo;t make it →
        </button>
      </div>
    </div>
  );
}

function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) {
    return "00:00:00";
  }
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) {
    return `${days}d ${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  })
    .format(date)
    .replace(":", "h");
}
