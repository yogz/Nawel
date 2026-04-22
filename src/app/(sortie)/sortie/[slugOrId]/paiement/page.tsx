import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { listPaymentMethodsForParticipant } from "@/features/sortie/queries/payment-method-queries";
import { PaymentMethodsManager } from "@/features/sortie/components/payment-methods-manager";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Mes moyens de paiement",
  robots: { index: false, follow: false },
};

export default async function PaymentMethodsPage({ params }: Props) {
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
    redirect(`/${canonical}/paiement`);
  }

  // Identify the current visitor as a participant on this outing; the methods
  // they manage here are scoped to that participant row.
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
    // Soft 404 — visiting this sub-route only makes sense after you've RSVPed.
    notFound();
  }

  const methods = await listPaymentMethodsForParticipant(me.id);

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

      <header className="mb-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          Moyens de paiement
        </p>
        <h1 className="font-serif text-3xl leading-tight text-encre-700">
          Comment on te rembourse
        </h1>
        <p className="mt-3 text-encre-500">
          Si tu es l&rsquo;acheteur·euse, renseigne un moyen pour que les autres te remboursent
          facilement. Chiffrés au repos, jamais affichés en clair dans les listes.
        </p>
      </header>

      <PaymentMethodsManager shortId={outing.shortId} methods={methods} />
    </main>
  );
}
