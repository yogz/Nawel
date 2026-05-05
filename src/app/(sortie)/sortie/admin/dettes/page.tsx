import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { listAdminDebtOutings } from "@/features/sortie/queries/admin-debt-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

export const metadata = {
  title: "Dettes — admin",
  robots: { index: false, follow: false },
};

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

function fmtEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function AdminDebtsListPage() {
  const rows = await listAdminDebtOutings();

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
        <Eyebrow className="mb-3">─ dettes ─</Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Dettes
        </h1>
        <p className="mt-3 text-[14px] text-ink-500">
          {rows.length} sortie{rows.length > 1 ? "s" : ""} avec un achat enregistré.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-ink-500">Aucun achat à superviser pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.outingId}
              className="rounded-2xl border border-surface-300 bg-surface-50 p-4 transition-colors hover:border-acid-600"
            >
              <Link
                href={`/admin/dettes/${r.shortId}`}
                className="group flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em]">
                    <span className="rounded-full bg-surface-200 px-2 py-0.5 text-ink-500">
                      {r.status}
                    </span>
                    <span className="text-ink-400">
                      {r.debtsCount} dette{r.debtsCount > 1 ? "s" : ""} · {r.totalPlaces} place
                      {r.totalPlaces > 1 ? "s" : ""}
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-[16px] font-bold text-ink-700">{r.title}</h2>
                  <p className="mt-1 text-[12px] text-ink-500">
                    payée par <strong className="text-ink-700">{r.buyer.name}</strong>
                    {r.fixedDatetime ? (
                      <>
                        {" "}
                        <span className="text-ink-400">·</span> {DATE_FMT.format(r.fixedDatetime)}
                      </>
                    ) : null}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    <span className="text-amber-700">
                      en attente : <strong>{fmtEuros(r.pendingCents)}€</strong>
                    </span>
                    <span className="text-blue-800">
                      déclaré : <strong>{fmtEuros(r.declaredPaidCents)}€</strong>
                    </span>
                    <span className="text-acid-700">
                      confirmé : <strong>{fmtEuros(r.confirmedCents)}€</strong>
                    </span>
                    <span className="text-ink-500">
                      total : <strong>{fmtEuros(r.totalCents)}€</strong>
                    </span>
                  </p>
                </div>
                <ArrowUpRight
                  size={16}
                  strokeWidth={2.2}
                  className="mt-1 shrink-0 text-ink-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-acid-600"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
