import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants, purchases } from "@drizzle/sortie-schema";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { getMyCredits, getMyDebts } from "@/features/sortie/queries/debt-queries";
import { DebtRow } from "@/features/sortie/components/debt-row";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Dettes",
  robots: { index: false, follow: false },
};

export default async function DebtsPage({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    notFound();
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    notFound();
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    redirect(`/${canonical}/dettes`);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await readParticipantTokenHash();
  const userId = session?.user?.id ?? null;
  const me = cookieTokenHash
    ? await db.query.participants.findFirst({
        where: and(
          eq(participants.outingId, outing.id),
          userId
            ? eq(participants.userId, userId)
            : eq(participants.cookieTokenHash, cookieTokenHash)
        ),
      })
    : null;
  if (!me) {
    notFound();
  }

  const [myDebts, myCredits, purchase] = await Promise.all([
    getMyDebts(outing.id, me.id),
    getMyCredits(outing.id, me.id),
    db.query.purchases.findFirst({
      where: eq(purchases.outingId, outing.id),
      columns: { proofFileUrl: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}`}
          className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
        >
          ← {outing.title}
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          L&rsquo;argent
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">Où en est-on&nbsp;?</h1>
        {purchase?.proofFileUrl && (
          <p className="mt-4 text-sm">
            <a
              href={purchase.proofFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-bordeaux-700 underline-offset-4 hover:underline"
            >
              Voir la preuve d&rsquo;achat ↗
            </a>
          </p>
        )}
      </header>

      {myDebts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-xl text-encre-700">Ce que tu dois</h2>
          <ul className="flex flex-col gap-3">
            {myDebts.map((d) => (
              <DebtRow
                key={d.id}
                shortId={outing.shortId}
                debtId={d.id}
                amountCents={d.amountCents}
                status={d.status}
                other={d.creditor}
                view="debtor"
                methods={d.creditorMethods}
              />
            ))}
          </ul>
        </section>
      )}

      {myCredits.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-xl text-encre-700">Ce qu&rsquo;on te doit</h2>
          <ul className="flex flex-col gap-3">
            {myCredits.map((d) => (
              <DebtRow
                key={d.id}
                shortId={outing.shortId}
                debtId={d.id}
                amountCents={d.amountCents}
                status={d.status}
                other={d.debtor}
                view="creditor"
              />
            ))}
          </ul>
          <p className="mt-3 text-xs text-encre-400">
            Renseigne un{" "}
            <Link className="underline-offset-4 hover:underline" href={`/${canonical}/paiement`}>
              moyen de paiement
            </Link>{" "}
            pour qu&rsquo;on puisse te rembourser.
          </p>
        </section>
      )}

      {myDebts.length === 0 && myCredits.length === 0 && (
        <p className="text-encre-500">Rien à régler pour cette sortie — tant mieux.</p>
      )}
    </main>
  );
}
