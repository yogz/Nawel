import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { getMyParticipant, getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { OutingHero } from "@/features/sortie/components/outing-hero";
import { ParticipantList } from "@/features/sortie/components/participant-list";
import { DeadlineBadge } from "@/features/sortie/components/deadline-badge";
import { ReclaimForm } from "@/features/sortie/components/reclaim-form";
import { RsvpSheet } from "@/features/sortie/components/rsvp-sheet";
import { ShareActions } from "@/features/sortie/components/share-actions";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    return { title: "Sortie" };
  }
  const outing = await getOutingByShortId(shortId);
  if (!outing || outing.status === "cancelled") {
    return { title: "Sortie" };
  }
  const dateLine = outing.fixedDatetime
    ? formatOutingDateConversational(outing.fixedDatetime)
    : null;
  const description = [dateLine, outing.location].filter(Boolean).join(" · ");

  return {
    title: outing.title,
    description: description || "Une sortie à partager entre amis.",
    robots: { index: false, follow: false },
    openGraph: {
      title: outing.title,
      description: description || undefined,
      type: "article",
      locale: "fr_FR",
      siteName: "Sortie",
    },
  };
}

export default async function OutingPublicPage({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    notFound();
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    notFound();
  }

  // Canonical redirect: /<shortId> → /<slug>-<shortId> when a slug is known.
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    redirect(`/${canonical}`);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await readParticipantTokenHash();
  const isCreator =
    (session?.user && session.user.id === outing.creatorUserId) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  const me = cookieTokenHash
    ? await getMyParticipant({
        outingId: outing.id,
        cookieTokenHash,
        userId: session?.user?.id ?? null,
      })
    : null;

  if (outing.status === "cancelled") {
    return <CancelledView title={outing.title} />;
  }

  const deadlinePassed = outing.deadlineAt < new Date();

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700">
          ← Sortie
        </Link>
        {isCreator && (
          <Link
            href={`/${canonical}/modifier`}
            className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
          >
            Modifier
          </Link>
        )}
      </nav>

      <div className="mb-4 flex justify-end">
        <ShareActions
          url={`${PUBLIC_BASE}/${canonical}`}
          title={outing.title}
          startsAt={outing.fixedDatetime}
        />
      </div>

      <OutingHero
        title={outing.title}
        location={outing.location}
        startsAt={outing.fixedDatetime}
        ticketUrl={outing.eventLink}
      />

      <section
        className="mt-10 rounded-t-[2rem] rounded-b-[1rem] bg-ivoire-50 p-6 shadow-[var(--shadow-velvet)]"
        aria-label="Les confirmés"
      >
        <ParticipantList participants={outing.participants} />

        <div className="mt-6 border-t border-ivoire-400 pt-4 text-center">
          <DeadlineBadge deadlineAt={outing.deadlineAt} />
        </div>
      </section>

      {!deadlinePassed && (
        <div className="mt-8 flex justify-center">
          <RsvpSheet
            shortId={outing.shortId}
            existingResponse={me ? (me.response as "yes" | "no" | "handle_own") : null}
            existingName={me?.anonName ?? session?.user?.name ?? undefined}
            existingExtraAdults={me?.extraAdults ?? 0}
            existingExtraChildren={me?.extraChildren ?? 0}
            existingEmail={me?.anonEmail ?? undefined}
          />
        </div>
      )}

      <p className="mt-6 text-center text-sm text-encre-400">
        {outing.creatorAnonName || outing.creatorUserId
          ? `Organisé par ${outing.creatorAnonName ?? "un membre CoList"}.`
          : ""}
      </p>

      {!isCreator && outing.creatorAnonEmail && (
        <div className="mt-8 flex justify-center">
          <ReclaimForm shortId={outing.shortId} />
        </div>
      )}
    </main>
  );
}

function CancelledView({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="mb-4 font-serif text-3xl text-encre-700">{title}</h1>
      <p className="text-encre-500">
        Cette sortie a été annulée. On se rattrape au prochain&nbsp;?
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-bordeaux-700 underline-offset-4 hover:underline"
      >
        Retour à l&rsquo;accueil
      </Link>
    </main>
  );
}
