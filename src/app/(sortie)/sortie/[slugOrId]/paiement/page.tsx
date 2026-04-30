import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { listPaymentMethodsForParticipant } from "@/features/sortie/queries/payment-method-queries";
import { PaymentMethodsManager } from "@/features/sortie/components/payment-methods-manager";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

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
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outing.title}
        </Link>
      </nav>

      <header className="mb-8">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ moyens de paiement ─
        </Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Comment
          <br />
          on te rembourse.
        </h1>
        <p className="mt-4 text-[15px] leading-[1.5] text-ink-500">
          Renseigne un moyen pour qu&rsquo;on te rembourse facilement. Chiffré au repos, jamais
          affiché en clair dans les listes.
        </p>
      </header>

      <PaymentMethodsManager shortId={outing.shortId} methods={methods} />
    </main>
  );
}
