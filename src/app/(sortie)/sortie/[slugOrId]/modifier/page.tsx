import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { EditOutingForm } from "@/features/sortie/components/edit-outing-form";

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
          Modifier
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">Les détails</h1>
      </header>

      <EditOutingForm
        shortId={outing.shortId}
        title={outing.title}
        venue={outing.location}
        startsAt={outing.fixedDatetime}
        deadlineAt={outing.deadlineAt}
        ticketUrl={outing.eventLink}
      />
    </main>
  );
}
