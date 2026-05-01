"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  BUCKET_LABEL,
  BUCKET_TONE,
  jLabel,
  type AgendaBucket,
} from "@/features/sortie/lib/agenda-buckets";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";

export type TicketVM = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  heroImageUrl: string | null;
  confirmedCount: number;
  daysUntil: number | null;
  isNextUp: boolean;
};

export type AgendaData = {
  groups: Array<{ bucket: AgendaBucket; items: TicketVM[] }>;
  totalCount: number;
};

const EASE = [0.16, 1, 0.3, 1] as const;

type Variant = "next" | "tbd" | "default";

function variantFor(ticket: TicketVM): Variant {
  if (ticket.isNextUp) return "next";
  if (ticket.startsAt === null) return "tbd";
  return "default";
}

const DOT_CLASS: Record<Variant, string> = {
  next: "bg-acid-600 shadow-[0_0_10px_var(--sortie-acid)]",
  tbd: "bg-hot-500",
  default: "bg-ink-300",
};

const TEXT_CLASS: Record<Variant, string> = {
  next: "text-acid-600",
  tbd: "text-hot-500",
  default: "text-ink-400",
};

const BORDER_CLASS: Record<Variant, string> = {
  next: "border-l-2 border-acid-600",
  tbd: "border-l border-ink-100",
  default: "border-l border-ink-100",
};

/**
 * Vue chronologique adaptative. Trois modes :
 *   total === 0  → empty hero centré, CTA acid
 *   total === 1  → billet seul agrandi (poster), pas de rail/col-J
 *   total >= 2   → timeline complète (rail vertical + col J-N + headers)
 *
 * `useReducedMotion()` court-circuite stagger + pulse marqueur.
 */
export function AgendaTimeline({ data }: { data: AgendaData }) {
  if (data.totalCount === 0) {
    return <EmptyAgenda />;
  }

  if (data.totalCount === 1) {
    const only = data.groups.flatMap((g) => g.items)[0];
    if (only) {
      return <SoloPoster ticket={only} />;
    }
  }

  // Sticky activé seulement si le scroll défile assez pour que ça ait du sens.
  const shouldStick = data.totalCount >= 8 && data.groups.length >= 2;

  return <FullTimeline data={data} shouldStick={shouldStick} />;
}

/* ─────────────────────────────  EMPTY  ──────────────────────────── */

function EmptyAgenda() {
  return (
    <section className="flex flex-col items-center pt-8 text-center">
      <div
        aria-hidden
        className="mb-6 font-display text-[160px] leading-none tracking-[-0.06em] text-ink-100"
      >
        ▽
      </div>
      <Eyebrow tone="muted" className="mb-3">
        ─ rien à l'horizon ─
      </Eyebrow>
      <p className="mb-8 max-w-xs font-display text-[28px] leading-[1.05] font-black tracking-[-0.03em] text-ink-700">
        Ton agenda est vide.
      </p>
      <Link
        href="/sortie/nouvelle"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-acid-600 px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-acid-50 shadow-[0_0_24px_var(--sortie-acid)] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
      >
        créer une sortie
        <ArrowRight size={14} strokeWidth={2.4} />
      </Link>
    </section>
  );
}

/* ───────────────────────────  TICKET CARD  ──────────────────────── */

type TicketCardProps = {
  ticket: TicketVM;
  size: "row" | "hero";
};

function TicketCard({ ticket, size }: TicketCardProps) {
  const canonical = ticket.slug ? `${ticket.slug}-${ticket.shortId}` : ticket.shortId;
  const variant = variantFor(ticket);
  const isTbd = ticket.startsAt === null;
  const isHero = size === "hero";

  return (
    <Link
      href={`/${canonical}`}
      className={`group relative block overflow-hidden ${
        isHero ? "rounded-2xl" : "rounded-xl"
      } bg-surface-50 ring-1 ring-ink-700/5 transition-colors hover:bg-surface-100 ${BORDER_CLASS[variant]}`}
    >
      {ticket.heroImageUrl && (
        <div className="absolute inset-0 -z-0 opacity-30">
          <Image
            src={ticket.heroImageUrl}
            alt=""
            fill
            sizes={isHero ? "(max-width: 768px) 100vw, 640px" : "(max-width: 768px) 100vw, 480px"}
            className="object-cover"
            priority={isHero}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-${
              isHero
                ? "tr from-surface-50 via-surface-50/40"
                : "r from-surface-50 via-surface-50/60"
            } to-transparent`}
          />
        </div>
      )}
      <div className={`relative z-10 flex flex-col ${isHero ? "gap-4 p-6" : "gap-2 p-4"}`}>
        <Eyebrow
          tone={ticket.isNextUp ? "acid" : isTbd ? "hot" : "muted"}
          glow={ticket.isNextUp && isHero}
          className={isHero ? "font-semibold" : undefined}
        >
          {isHero && (
            <>
              {jLabel(ticket.daysUntil)}
              {ticket.startsAt ? ` · ${formatOutingDateShort(ticket.startsAt)}` : " · à programmer"}
            </>
          )}
          {!isHero && (
            <>
              {isTbd ? "à programmer" : formatOutingDateShort(ticket.startsAt!)}
              {ticket.isNextUp && " · prochaine"}
            </>
          )}
        </Eyebrow>
        {isHero ? (
          <h2 className="font-display text-[40px] leading-[0.98] font-black tracking-[-0.035em] text-ink-700">
            {ticket.title}
          </h2>
        ) : (
          <h3 className="font-display text-[22px] leading-[1.05] font-black tracking-[-0.025em] text-ink-700">
            {ticket.title}
          </h3>
        )}
        {ticket.location && (
          <p
            className={`font-mono uppercase ${
              isHero ? "text-[12.5px] tracking-[0.14em]" : "text-[12px] tracking-[0.14em]"
            } text-ink-500`}
          >
            ◉ {formatVenue(ticket.location)}
          </p>
        )}
        {!isHero && (
          <div className="flex items-center gap-3">
            {ticket.confirmedCount > 0 && (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
                {ticket.confirmedCount} confirmé{ticket.confirmedCount > 1 ? "s" : ""}
              </span>
            )}
            {isTbd && (
              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-hot-500">
                <Calendar size={11} strokeWidth={2.4} />→ choisir la date
              </span>
            )}
          </div>
        )}
        {isHero && ticket.confirmedCount > 0 && (
          <Eyebrow tone="muted">
            ─ {ticket.confirmedCount} confirmé{ticket.confirmedCount > 1 ? "s" : ""} ─
          </Eyebrow>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────  SOLO POSTER  ───────────────────────── */

function SoloPoster({ ticket }: { ticket: TicketVM }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Eyebrow glow tone="acid" className="mb-3">
        ─ ta prochaine sortie ─
      </Eyebrow>
      <TicketCard ticket={ticket} size="hero" />
    </motion.div>
  );
}

/* ────────────────────────  FULL TIMELINE  ──────────────────────── */

function FullTimeline({ data, shouldStick }: { data: AgendaData; shouldStick: boolean }) {
  const reduce = useReducedMotion();

  // Stagger plafonné — sur 30 items, 0.08 × 30 = 2.4s c'est interminable.
  const stagger = data.totalCount > 10 ? 0.04 : 0.08;

  const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
  };

  const showHeaders = data.groups.length > 1;

  return (
    <motion.div
      className="relative"
      // Rail vertical continu — un seul trait sur toute la timeline.
      // `::before` cassé sous motion.div à cause des transforms,
      // backgroundImage est plus robuste.
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.06) 100%)",
        backgroundSize: "1px 100%",
        backgroundPosition: "1.25rem 0",
        backgroundRepeat: "no-repeat",
      }}
      variants={containerVariants}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      {data.groups.map((group, gi) => (
        <section key={group.bucket} className={gi === 0 ? "" : "mt-8"}>
          {showHeaders && <BucketHeader bucket={group.bucket} sticky={shouldStick} />}
          <ol className="flex flex-col gap-3">
            {group.items.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </ol>
        </section>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────  BUCKET HEADER  ─────────────────────── */

function BucketHeader({ bucket, sticky }: { bucket: AgendaBucket; sticky: boolean }) {
  return (
    <div
      className={`z-10 mb-4 grid grid-cols-[2.5rem_1fr] items-center gap-3 ${
        sticky ? "sticky top-2 bg-surface-50/85 py-2 backdrop-blur-sm" : ""
      }`}
    >
      {bucket === "today" ? <TodayDot /> : <span aria-hidden />}
      <Eyebrow glow={bucket === "today"} tone={BUCKET_TONE[bucket]}>
        ─ {BUCKET_LABEL[bucket]} ─
      </Eyebrow>
    </div>
  );
}

function TodayDot() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="mx-auto block h-2 w-2 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
      animate={reduce ? undefined : { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
      transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ───────────────────────────  TICKET ROW  ──────────────────────── */

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

function TicketRow({ ticket }: { ticket: TicketVM }) {
  const variant = variantFor(ticket);
  return (
    <motion.li
      variants={itemVariants}
      className="grid grid-cols-[2.5rem_3.25rem_1fr] items-stretch gap-3"
    >
      <span
        aria-hidden
        className={`mx-auto mt-4 block h-2 w-2 rounded-full ${DOT_CLASS[variant]}`}
      />
      <span
        className={`pt-4 font-mono text-[11px] uppercase tracking-[0.18em] ${TEXT_CLASS[variant]}`}
      >
        {jLabel(ticket.daysUntil)}
      </span>
      <TicketCard ticket={ticket} size="row" />
    </motion.li>
  );
}
