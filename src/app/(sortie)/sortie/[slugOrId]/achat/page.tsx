import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants, purchases } from "@drizzle/sortie-schema";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
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

  const nameByParticipant = new Map(
    outing.participants.map((p) => [p.id, displayNameOf(p) ?? "Quelqu'un"])
  );

  // Compute two views: normal (buyer included) and ghost (buyer excluded).
  // The form flips between them based on the checkbox without another round
  // trip; the server re-derives from scratch at submit time so a tampered
  // checkbox can't mis-seat anyone.
  function buildView(rowsSubset: typeof yesRows) {
    const plan = buildAllocationPlan(rowsSubset);
    const seatCount = new Map<string, number>();
    const allocations: AllocationRowView[] = plan.map((entry) => {
      const nth = (seatCount.get(entry.participantId) ?? 0) + 1;
      seatCount.set(entry.participantId, nth);
      const baseName = nameByParticipant.get(entry.participantId) ?? "Quelqu'un";
      const displayName = nth === 1 ? baseName : `${baseName} (+${nth - 1})`;
      return { participantId: entry.participantId, displayName, isChild: entry.isChild };
    });
    return {
      totalPlaces: plan.length,
      adultCount: plan.filter((a) => !a.isChild).length,
      childCount: plan.filter((a) => a.isChild).length,
      allocations,
    };
  }

  const normalView = buildView(yesRows);
  const ghostView = buildView(yesRows.filter((r) => r.id !== me.id));

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

      <header className="mb-10">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-hot-500">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]"
          />
          ─ déclarer l&rsquo;achat ─
        </p>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
          Combien
          <br />
          ça a coûté&nbsp;?
        </h1>
      </header>

      <PurchaseForm
        shortId={outing.shortId}
        normalView={normalView}
        ghostView={ghostView}
        canGhost={ghostView.totalPlaces > 0}
      />
    </main>
  );
}
