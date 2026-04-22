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
import { buildAllocationPlan } from "@/features/sortie/lib/allocation-plan";
import { PurchaseForm, type AllocationRowView } from "@/features/sortie/components/purchase-form";

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
    notFound();
  }

  const existing = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (existing) {
    redirect(`/${canonical}/dettes`);
  }

  // Build the same allocation plan the action will rebuild on submit, so
  // nominal-mode rows are in the canonical order and the client displays a
  // friendly name for each seat.
  const yesRows = outing.participants
    .filter((p) => p.response === "yes")
    .map((p) => ({
      id: p.id,
      respondedAt: p.respondedAt,
      extraAdults: p.extraAdults,
      extraChildren: p.extraChildren,
    }));
  const plan = buildAllocationPlan(yesRows);

  const nameByParticipant = new Map(
    outing.participants.map((p) => [p.id, p.anonName ?? "Quelqu'un"])
  );
  const seatCountByParticipant = new Map<string, number>();
  const allocations: AllocationRowView[] = plan.map((entry) => {
    const nth = (seatCountByParticipant.get(entry.participantId) ?? 0) + 1;
    seatCountByParticipant.set(entry.participantId, nth);
    const baseName = nameByParticipant.get(entry.participantId) ?? "Quelqu'un";
    const displayName = nth === 1 ? baseName : `${baseName} (+${nth - 1})`;
    return { participantId: entry.participantId, displayName, isChild: entry.isChild };
  });

  const totalPlaces = plan.length;
  const adultCount = plan.filter((a) => !a.isChild).length;
  const childCount = plan.filter((a) => a.isChild).length;

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
      </header>

      <PurchaseForm
        shortId={outing.shortId}
        totalPlaces={totalPlaces}
        adultCount={adultCount}
        childCount={childCount}
        allocations={allocations}
      />
    </main>
  );
}
