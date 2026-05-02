import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Ban, Clock } from "lucide-react";
import {
  listAdminOutings,
  countAdminOutings,
  type AdminOutingRow,
} from "@/features/sortie/queries/admin-outing-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { plural } from "@/features/sortie/lib/plural";

export const metadata = {
  title: "Sorties — admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 30;

const STATUS_LABEL: Record<AdminOutingRow["status"], string> = {
  open: "ouverte",
  awaiting_purchase: "achat en attente",
  stale_purchase: "achat en retard",
  purchased: "achetée",
  past: "passée",
  settled: "soldée",
  cancelled: "annulée",
};

const STATUS_TONE: Record<AdminOutingRow["status"], string> = {
  open: "text-acid-700 bg-acid-100",
  awaiting_purchase: "text-amber-800 bg-amber-100",
  stale_purchase: "text-red-800 bg-red-100",
  purchased: "text-blue-800 bg-blue-100",
  past: "text-ink-500 bg-surface-200",
  settled: "text-ink-400 bg-surface-100",
  cancelled: "text-red-900 bg-red-100",
};

// Toutes les dates admin sont rendues en heure Paris pour rester
// cohérentes avec le reste de l'app, peu importe la machine de l'admin.
const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});
const DATE_SHORT_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

type SearchParams = Promise<{ page?: string }>;

export default async function AdminOutingsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    listAdminOutings({ limit: PAGE_SIZE, offset }),
    countAdminOutings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          admin
        </Link>
      </nav>

      <header className="mb-8">
        <Eyebrow className="mb-3">─ sorties ─</Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Sorties
        </h1>
        <p className="mt-3 text-[14px] text-ink-500">
          {total} au total — page {page} / {totalPages}.
        </p>
      </header>

      <ul className="space-y-2">
        {rows.map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border border-surface-300 bg-surface-50 p-4 transition-colors hover:border-acid-600"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STATUS_TONE[o.status]}`}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                  {o.cancelledAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-900">
                      <Ban size={10} strokeWidth={2.2} /> annulée le{" "}
                      {DATE_SHORT_FMT.format(o.cancelledAt)}
                    </span>
                  ) : null}
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
                    {o.mode}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-[16px] font-bold text-ink-700">{o.title}</h2>
                <p className="mt-1 text-[12px] text-ink-500">
                  par <strong className="text-ink-700">{o.creator.name}</strong>
                  {o.creator.email ? (
                    <>
                      {" "}
                      <span className="text-ink-400">·</span> {o.creator.email}
                    </>
                  ) : null}
                  {o.creator.isAnon ? <span className="ml-1 text-ink-400">(anon)</span> : null}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} strokeWidth={2} />
                    créée {DATE_FMT.format(o.createdAt)}
                  </span>
                  {o.fixedDatetime ? (
                    <span>· prévue {DATE_FMT.format(o.fixedDatetime)}</span>
                  ) : (
                    <span>· date à voter</span>
                  )}
                  <span>· deadline {DATE_FMT.format(o.deadlineAt)}</span>
                  <span>
                    · {o.confirmedCount} {plural(o.confirmedCount, "confirmé")}
                  </span>
                </p>
              </div>
              <Link
                href={`/${o.shortId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-full border border-surface-300 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-acid-600 hover:text-acid-600"
                aria-label={`Ouvrir la sortie ${o.title}`}
              >
                voir
                <ArrowUpRight size={12} strokeWidth={2.2} />
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
          <PageLink page={page - 1} disabled={page <= 1} label="← précédent" />
          <span>
            {page} / {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} label="suivant →" />
        </nav>
      ) : null}
    </main>
  );
}

function PageLink({ page, disabled, label }: { page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="text-ink-300">{label}</span>;
  }
  return (
    <Link
      href={`/admin/outings?page=${page}`}
      className="rounded-full border border-surface-300 px-3 py-2 transition-colors hover:border-acid-600 hover:text-acid-600"
    >
      {label}
    </Link>
  );
}
