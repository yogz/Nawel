import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth-config";
import { cn } from "@/lib/utils";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import {
  getAllocationPriceCents,
  formatAllocationLabel,
} from "@/features/sortie/lib/format-allocation";
import {
  getWalletAllocations,
  getWalletCredits,
  getWalletDebts,
  type WalletAllocationRow,
  type WalletDebtRow,
} from "@/features/sortie/queries/wallet-queries";
import { DebtRow } from "@/features/sortie/components/debt-row";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { LoginLink } from "@/features/sortie/components/login-link";

// La page agrège des données financières privées de l'utilisateur
// connecté ; on désactive tout pré-rendu et toute mise en cache pour
// éviter qu'un proxy CDN serve une version d'une autre session.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon argent",
  robots: { index: false, follow: false },
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function outingHref(outing: WalletDebtRow["outing"], suffix?: string): string {
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  return suffix ? `/${canonical}/${suffix}` : `/${canonical}`;
}

export default async function WalletPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <nav className="mb-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
            accueil
          </Link>
        </nav>
        <header className="mb-10">
          <Eyebrow tone="hot" glow className="mb-3">
            ─ mon argent
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
            Connexion
            <br />
            requise.
          </h1>
        </header>
        <p className="mb-6 text-[15px] text-ink-500">
          Connecte-toi pour voir tes dépenses, tes dettes et tes crédits sur toutes tes sorties.
        </p>
        <LoginLink variant="primary" label="Se connecter" />
      </main>
    );
  }

  const userId = session.user.id;
  const [allDebts, allCredits, allocations] = await Promise.all([
    getWalletDebts(userId),
    getWalletCredits(userId),
    getWalletAllocations(userId),
  ]);

  // Les dettes confirmed n'entrent pas dans le total « tu dois » mais
  // restent visibles dans la section dédiée pour rappel ; idem pour les
  // crédits. On affiche d'abord pending, puis declared_paid, puis confirmed.
  const debts = sortDebtsForDisplay(allDebts);
  const credits = sortDebtsForDisplay(allCredits);

  const totalOwedCents = debts
    .filter((d) => d.status !== "confirmed")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const totalToReceiveCents = credits
    .filter((d) => d.status !== "confirmed")
    .reduce((acc, d) => acc + d.amountCents, 0);

  // Bandeau « renseigne un moyen de paiement » : on ne pousse l'incitation
  // que si le user a au moins un crédit en attente ET aucune méthode
  // déclarée sur les sorties concernées. Évite de spammer un user qui a
  // déjà rempli son IBAN partout.
  const creditsWithoutMethod = credits.filter(
    (d) => d.status !== "confirmed" && d.creditorMethods.length === 0
  );
  const distinctOutingsForMissingMethod = dedupOutings(creditsWithoutMethod.map((d) => d.outing));

  const allocationsByOuting = groupAllocationsByOuting(allocations);

  const hasAnyData = debts.length > 0 || credits.length > 0 || allocations.length > 0;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/moi"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          mon profil
        </Link>
      </nav>

      <header className="mb-10">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ mon argent
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
          Où en es-tu&nbsp;?
        </h1>
      </header>

      {!hasAnyData ? (
        <section className="mb-10">
          <p className="text-[15px] text-ink-500">
            Tu n&rsquo;as pas encore participé à une sortie avec ce compte.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 text-acid-700 underline-offset-4 hover:underline"
          >
            Voir les sorties <ArrowUpRight size={14} strokeWidth={2.2} />
          </Link>
        </section>
      ) : (
        <section className="mb-12 grid grid-cols-2 gap-3">
          <Stat label="Tu dois" amountCents={totalOwedCents} tone="hot" />
          <Stat label="On te doit" amountCents={totalToReceiveCents} tone="acid" />
        </section>
      )}

      {debts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-[24px] font-black tracking-[-0.025em] text-ink-700">
            Ce que tu dois
          </h2>
          <ul className="flex flex-col gap-3">
            {debts.map((d) => (
              <DebtRow
                key={d.id}
                shortId={d.outing.shortId}
                debtId={d.id}
                amountCents={d.amountCents}
                status={d.status}
                other={d.creditor}
                view="debtor"
                methods={d.creditorMethods}
                outingTitle={d.outing.title}
                outingHref={outingHref(d.outing, "dettes")}
              />
            ))}
          </ul>
        </section>
      )}

      {credits.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-[24px] font-black tracking-[-0.025em] text-ink-700">
            Ce qu&rsquo;on te doit
          </h2>
          {distinctOutingsForMissingMethod.length > 0 && (
            <div className="mb-4 rounded-lg border border-hot-500/40 bg-hot-500/5 p-3 text-[13px] text-ink-700">
              <p className="font-medium">
                Renseigne un moyen de paiement pour être remboursé&nbsp;:
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {distinctOutingsForMissingMethod.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={outingHref(o, "paiement")}
                      className="text-acid-700 underline-offset-4 hover:underline"
                    >
                      {o.title} ↗
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {credits.map((d) => (
              <DebtRow
                key={d.id}
                shortId={d.outing.shortId}
                debtId={d.id}
                amountCents={d.amountCents}
                status={d.status}
                other={d.debtor}
                view="creditor"
                outingTitle={d.outing.title}
                outingHref={outingHref(d.outing, "dettes")}
              />
            ))}
          </ul>
        </section>
      )}

      {allocationsByOuting.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-[24px] font-black tracking-[-0.025em] text-ink-700">
            Tes dépenses par sortie
          </h2>
          <ul className="flex flex-col gap-3">
            {allocationsByOuting.map((group) => (
              <li
                key={group.outing.id}
                className="flex flex-col gap-2 rounded-lg border border-surface-400 bg-surface-50 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={outingHref(group.outing)}
                    className="min-w-0 truncate font-serif text-lg text-ink-700 underline-offset-4 hover:text-acid-700 hover:underline"
                  >
                    {group.outing.title}
                  </Link>
                  <span className="shrink-0 font-serif text-xl tabular-nums text-ink-700">
                    {group.totalCents > 0 ? formatCents(group.totalCents) : "—"}
                  </span>
                </div>
                <ul className="flex flex-col gap-1 text-sm text-ink-500">
                  {group.allocations.map((a) => {
                    const price = getAllocationPriceCents(a);
                    return (
                      <li key={a.id}>
                        {price === null
                          ? `${a.isChild ? "place enfant" : "place adulte"} · prix non renseigné`
                          : formatAllocationLabel(a)}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasAnyData && (
        <footer className="mt-12 border-t border-ink-100 pt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
          ↳ les sorties auxquelles tu as participé en anonyme avant de te connecter ne sont pas
          comptées ici.
        </footer>
      )}
    </main>
  );
}

function Stat({
  label,
  amountCents,
  tone,
}: {
  label: string;
  amountCents: number;
  tone?: "hot" | "acid";
}) {
  // Le tone ne s'applique qu'aux montants non nuls : afficher « Tu dois
  // 0,00 € » en hot pink créerait une fausse alerte (cf. Eyebrow rule
  // « hot strictement réservé aux nudges actionnables »). À zéro, la
  // tile retombe en neutre/muted.
  const isActive = amountCents > 0;
  const valueColor = !isActive
    ? "text-ink-500"
    : tone === "hot"
      ? "text-hot-600"
      : tone === "acid"
        ? "text-acid-700"
        : "text-ink-700";
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-surface-400 bg-surface-50 p-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-serif text-lg font-black tabular-nums tracking-[-0.02em] sm:text-xl",
          valueColor
        )}
      >
        {formatCents(amountCents)}
      </span>
    </div>
  );
}

const STATUS_RANK: Record<WalletDebtRow["status"], number> = {
  pending: 0,
  declared_paid: 1,
  confirmed: 2,
};

function sortDebtsForDisplay(rows: WalletDebtRow[]): WalletDebtRow[] {
  return [...rows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}

function dedupOutings(list: WalletDebtRow["outing"][]): WalletDebtRow["outing"][] {
  const seen = new Set<string>();
  const out: WalletDebtRow["outing"][] = [];
  for (const o of list) {
    if (seen.has(o.id)) {
      continue;
    }
    seen.add(o.id);
    out.push(o);
  }
  return out;
}

type AllocationGroup = {
  outing: WalletAllocationRow["outing"];
  allocations: WalletAllocationRow[];
  totalCents: number;
};

function groupAllocationsByOuting(rows: WalletAllocationRow[]): AllocationGroup[] {
  const map = new Map<string, AllocationGroup>();
  for (const r of rows) {
    const existing = map.get(r.outing.id);
    const price = getAllocationPriceCents(r) ?? 0;
    if (existing) {
      existing.allocations.push(r);
      existing.totalCents += price;
    } else {
      map.set(r.outing.id, {
        outing: r.outing,
        allocations: [r],
        totalCents: price,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.outing.title.localeCompare(b.outing.title));
}
