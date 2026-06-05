import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { debts, purchaseAllocations, purchases } from "@drizzle/sortie-schema";
import { loadParticipantPage } from "@/features/sortie/lib/load-participant-page";
import { ParticipantAuthGate } from "@/features/sortie/components/participant-auth-gate";
import { NotParticipantNotice } from "@/features/sortie/components/not-participant-notice";
import { isLedgerLockingStatus } from "@/features/sortie/lib/compute-debt-rows";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import {
  EditPurchaseForm,
  type NominalRowView,
} from "@/features/sortie/components/edit-purchase-form";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Modifier le prix",
  robots: { index: false, follow: false },
};

export default async function EditPurchasePricePage({ params }: Props) {
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

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  // Rien à modifier tant qu'aucun achat n'a été déclaré.
  if (!purchase) {
    redirect(`/${canonical}/achat`);
  }
  // Seul l'acheteur édite le prix — sinon 404 (l'URL n'aurait pas dû fuiter).
  if (purchase.purchaserParticipantId !== me.id) {
    notFound();
  }

  const [allocations, outingDebts] = await Promise.all([
    db
      .select({
        id: purchaseAllocations.id,
        participantId: purchaseAllocations.participantId,
        isChild: purchaseAllocations.isChild,
        giftedAt: purchaseAllocations.giftedAt,
        nominalPriceCents: purchaseAllocations.nominalPriceCents,
      })
      .from(purchaseAllocations)
      .where(eq(purchaseAllocations.purchaseId, purchase.id)),
    db.select({ status: debts.status }).from(debts).where(eq(debts.outingId, outing.id)),
  ]);

  // Verrou : si un paiement a déjà été déclaré, le recalcul (donc l'édition)
  // est bloqué côté serveur — on ne montre pas un formulaire qui échouerait.
  const ledgerLocked = outingDebts.some((d) => isLedgerLockingStatus(d.status));

  const nameByParticipant = new Map(
    outing.participants.map((p) => [p.id, displayNameOf(p) ?? "Quelqu'un"])
  );

  const nominalRows: NominalRowView[] = allocations.map((a) => ({
    allocationId: a.id,
    displayName: nameByParticipant.get(a.participantId) ?? "Quelqu'un",
    isChild: a.isChild,
    gifted: a.giftedAt !== null,
    priceCents: a.nominalPriceCents ?? 0,
  }));
  const adultCount = allocations.filter((a) => !a.isChild).length;
  const childCount = allocations.filter((a) => a.isChild).length;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}/dettes`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outing.title}
        </Link>
      </nav>

      <header className="mb-10">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ modifier le prix ─
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
          Corriger
          <br />
          le montant
        </h1>
      </header>

      {ledgerLocked ? (
        <div className="rounded-lg border border-erreur-500/30 bg-erreur-50 p-4 text-sm text-erreur-700">
          <p className="font-semibold">Modification bloquée.</p>
          <p className="mt-1">
            Un paiement a déjà été déclaré sur cette sortie — le prix ne peut plus être modifié pour
            ne pas effacer un règlement en cours. Contacte l&rsquo;organisateur si besoin.
          </p>
        </div>
      ) : (
        <EditPurchaseForm
          shortId={outing.shortId}
          mode={purchase.pricingMode}
          uniquePriceCents={purchase.uniquePriceCents ?? 0}
          placesCount={purchase.totalPlaces}
          adultPriceCents={purchase.adultPriceCents ?? 0}
          childPriceCents={purchase.childPriceCents ?? 0}
          adultCount={adultCount}
          childCount={childCount}
          nominalRows={nominalRows}
        />
      )}
    </main>
  );
}
