import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadParticipantPage } from "@/features/sortie/lib/load-participant-page";
import { ParticipantAuthGate } from "@/features/sortie/components/participant-auth-gate";
import { NotParticipantNotice } from "@/features/sortie/components/not-participant-notice";
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
  const state = await loadParticipantPage(slugOrId, "paiement");
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
        subPath="paiement"
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
