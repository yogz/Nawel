import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth-config";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { EditOutingForm } from "@/features/sortie/components/edit-outing-form";
import { CancelOutingButton } from "@/features/sortie/components/cancel-outing-button";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Modifier la sortie",
  robots: { index: false, follow: false },
};

export default async function EditOutingPage({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    notFound();
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await readParticipantTokenHash();
  const isCreator =
    (session?.user && session.user.id === outing.creatorUserId) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isCreator) {
    // Soft 404 — don't leak that the outing exists to random visitors.
    notFound();
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    redirect(`/${canonical}/modifier`);
  }

  // Hide the cancel CTA once the event itself is in the past — "Annuler"
  // has no meaningful semantics after the fact and would only confuse.
  const isPastEvent = outing.fixedDatetime !== null && outing.fixedDatetime < new Date();

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outing.title}
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ modifier ─
        </p>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700">
          Les détails.
        </h1>
      </header>

      {outing.mode === "vote" && !outing.chosenTimeslotId ? (
        <div className="rounded-lg border border-ivoire-400 bg-ivoire-50 p-4 text-sm text-encre-500">
          Le sondage est encore ouvert. Tu pourras modifier les détails une fois un créneau choisi.
          En attendant, tu peux toujours annuler.
        </div>
      ) : (
        <EditOutingForm
          shortId={outing.shortId}
          title={outing.title}
          venue={outing.location}
          startsAt={outing.fixedDatetime}
          deadlineAt={outing.deadlineAt}
          ticketUrl={outing.eventLink}
        />
      )}

      {outing.status !== "cancelled" && !isPastEvent && (
        <section className="mt-12 border-t border-ivoire-400 pt-8">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-500">
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-or-500 shadow-[0_0_10px_var(--sortie-hot)]"
            />
            ─ zone sensible ─
          </p>
          <h2 className="mb-2 text-2xl font-black tracking-[-0.025em] text-encre-700">
            Annuler la sortie
          </h2>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
            ↳ tous les inscrits sont prévenus par email. définitif.
          </p>
          <CancelOutingButton
            shortId={outing.shortId}
            outingTitle={outing.title}
            confirmedCount={outing.participants.filter((p) => p.response === "yes").length}
          />
        </section>
      )}
    </main>
  );
}
