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
import { PurchaseForm } from "@/features/sortie/components/purchase-form";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Déclarer l'achat",
  robots: { index: false, follow: false },
};

export default async function PurchaseDeclarationPage({ params }: Props) {
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
    redirect(`/${canonical}/achat`);
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

  if (!me || me.response !== "yes") {
    // Only confirmed attendees can declare a purchase; anyone else shouldn't
    // know the route exists.
    notFound();
  }

  // Idempotency: once a purchase is logged, kick visitors to the debt view.
  const existing = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (existing) {
    redirect(`/${canonical}/dettes`);
  }

  const totalPlaces = outing.participants
    .filter((p) => p.response === "yes")
    .reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

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
          Déclarer l&rsquo;achat
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">
          Combien ça a coûté&nbsp;?
        </h1>
        <p className="mt-3 text-encre-500">
          Pour l&rsquo;instant, prix unique par place. On gère le détail des catégories et les
          tarifs nominatifs dans la prochaine mise à jour.
        </p>
      </header>

      <PurchaseForm shortId={outing.shortId} totalPlaces={totalPlaces} />
    </main>
  );
}
