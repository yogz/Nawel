import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { purchases } from "@drizzle/sortie-schema";
import { loadParticipantPage } from "@/features/sortie/lib/load-participant-page";
import { ParticipantAuthGate } from "@/features/sortie/components/participant-auth-gate";
import { NotParticipantNotice } from "@/features/sortie/components/not-participant-notice";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import { buildAllocationPlan } from "@/features/sortie/lib/allocation-plan";
import { PurchaseForm, type AllocationRowView } from "@/features/sortie/components/purchase-form";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Déclarer l'achat",
  robots: { index: false, follow: false },
};

export default async function PurchaseDeclarationPage({ params }: Props) {
  const { slugOrId } = await params;
  const state = await loadParticipantPage(slugOrId, "achat");
  if (state.kind === "not-found") {
    notFound();
  }
  if (state.kind === "redirect") {
    redirect(state.to);
  }
  if (state.kind === "needs-auth") {
    return (
      <ParticipantAuthGate
        outingTitle={state.outing.title}
        canonical={state.canonical}
        prefillEmail={state.prefillEmail}
        subPath="achat"
      />
    );
  }
  if (state.kind === "not-participant") {
    return (
      <NotParticipantNotice
        outingTitle={state.outing.title}
        canonical={state.canonical}
        userEmail={state.userEmail}
      />
    );
  }

  const { outing, me, canonical } = state;

  // Une row participant existe mais l'utilisateur n'a pas confirmé sa
  // présence — pas le droit de déclarer l'achat. On garde le 404
  // historique : l'utilisateur arrive sur l'URL en suivant un lien
  // qu'il n'aurait pas dû avoir.
  if (me.response !== "yes") {
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
        <Eyebrow tone="hot" glow className="mb-3">
          ─ déclarer l&rsquo;achat ─
        </Eyebrow>
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
