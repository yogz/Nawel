import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import { getAdminDebtView } from "@/features/sortie/queries/admin-debt-queries";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { SwapPurchaserForm } from "@/features/sortie/components/admin/swap-purchaser-form";
import { AdminDebtRow } from "@/features/sortie/components/admin/admin-debt-row";

export const metadata = {
  title: "Dettes — admin",
  robots: { index: false, follow: false },
};

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function fmtEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

type Props = { params: Promise<{ shortId: string }> };

export default async function AdminDebtDetailPage({ params }: Props) {
  const { shortId } = await params;
  const view = await getAdminDebtView(shortId);
  if (!view) {
    notFound();
  }

  const { outing, purchase, participants, allocations, debts: debtRows, audit } = view;

  const swapLocked = debtRows.some((d) => d.status !== "pending");
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  const buyerName = participants.find((p) => p.id === purchase.purchaserParticipantId)?.name ?? "—";

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin/dettes"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          dettes
        </Link>
      </nav>

      <header className="mb-8">
        <Eyebrow className="mb-3">─ {outing.status} ─</Eyebrow>
        <h1 className="text-3xl leading-[0.95] font-black tracking-[-0.03em] text-ink-700 sm:text-4xl">
          {outing.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
          {outing.fixedDatetime ? <span>{DATE_FMT.format(outing.fixedDatetime)}</span> : null}
          <Link
            href={`/${canonical}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-acid-700 underline-offset-4 hover:underline"
          >
            page publique
            <ArrowUpRight size={12} strokeWidth={2.2} />
          </Link>
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-surface-300 bg-surface-50 p-5">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400">payeur</h2>
        <p className="mt-2 text-2xl font-black tracking-[-0.02em] text-ink-700">{buyerName}</p>
        <p className="mt-1 text-[12px] text-ink-500">
          {purchase.totalPlaces} place{purchase.totalPlaces > 1 ? "s" : ""} · mode{" "}
          <strong>{purchase.pricingMode}</strong>
          {purchase.pricingMode === "unique" && purchase.uniquePriceCents !== null
            ? ` · ${fmtEuros(purchase.uniquePriceCents)}€/place`
            : null}
          {purchase.pricingMode === "category"
            ? ` · adulte ${fmtEuros(purchase.adultPriceCents ?? 0)}€ / enfant ${fmtEuros(purchase.childPriceCents ?? 0)}€`
            : null}
        </p>
        {purchase.proofFileUrl ? (
          <p className="mt-2 text-[12px]">
            <a
              href={purchase.proofFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-acid-700 underline-offset-4 hover:underline"
            >
              <FileText size={12} strokeWidth={2.2} />
              preuve d&rsquo;achat
            </a>
          </p>
        ) : null}

        <div className="mt-4">
          <SwapPurchaserForm
            shortId={outing.shortId}
            currentBuyerName={buyerName}
            candidates={participants
              .filter((p) => p.hasAllocation)
              .map((p) => ({
                participantId: p.id,
                name: p.name,
                isBuyer: p.isBuyer,
              }))}
            locked={swapLocked}
            lockReason={
              swapLocked
                ? "Au moins une dette n'est plus en 'pending'. Repasse-les en 'en attente' avant de basculer."
                : undefined
            }
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400">
          allocations ({allocations.length})
        </h2>
        <ul className="space-y-1.5">
          {allocations.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm"
            >
              <span className="text-ink-700">
                {a.participantName}
                {a.isChild ? <span className="ml-2 text-ink-400">(enfant)</span> : null}
              </span>
              {a.nominalPriceCents !== null ? (
                <span className="text-xs text-ink-500">{fmtEuros(a.nominalPriceCents)}€</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400">
          dettes ({debtRows.length})
        </h2>
        {debtRows.length === 0 ? (
          <p className="text-ink-500">Aucune dette enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {debtRows.map((d) => (
              <AdminDebtRow
                key={d.id}
                debtId={d.id}
                amountCents={d.amountCents}
                status={d.status}
                declaredAt={d.declaredAt}
                confirmedAt={d.confirmedAt}
                debtorName={d.debtor.name}
                creditorName={d.creditor.name}
              />
            ))}
          </ul>
        )}
      </section>

      {audit.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400">
            audit ({audit.length})
          </h2>
          <ul className="space-y-1 font-mono text-[11px] text-ink-500">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3">
                <span className="text-ink-400">{DATE_FMT.format(a.createdAt)}</span>
                <strong className="text-ink-700">{a.action}</strong>
                {a.actorName ? <span>par {a.actorName}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
