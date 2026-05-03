import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth-config";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { getOutingByShortId, getMyParticipant } from "@/features/sortie/queries/outing-queries";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { ParticipantAuthGate } from "@/features/sortie/components/participant-auth-gate";
import { NotParticipantNotice } from "@/features/sortie/components/not-participant-notice";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { TicketsOrganizerPanel } from "@/features/sortie/components/tickets-organizer-panel";
import { TicketsOrganizerList } from "@/features/sortie/components/tickets-organizer-list";
import { TicketsParticipantList } from "@/features/sortie/components/tickets-participant-list";
import {
  listTicketRecipientCandidates,
  listTicketsForOrganizer,
  listTicketsForParticipant,
} from "@/features/sortie/queries/ticket-queries";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Billets",
  robots: { index: false, follow: false },
};

export default async function TicketsPage({ params }: Props) {
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
    redirect(`/${canonical}/billets`);
  }

  const [session, cookieTokenHash] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    readParticipantTokenHash(),
  ]);
  const sessionUserId = session?.user?.id ?? null;

  // L'accès aux billets exige un compte avec email vérifié — c'est la règle
  // métier centrale du Lot 1 (cf. ticket-actions, ticket-auth). On gate
  // ici directement, plus de fallback cookie-only même pour la lecture.
  if (!sessionUserId) {
    return (
      <ParticipantAuthGate
        outingTitle={outing.title}
        canonical={canonical}
        prefillEmail={null}
        subPath="billets"
      />
    );
  }
  if (!session?.user?.emailVerified) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <BackLink canonical={canonical} title={outing.title} />
        <header className="mb-8">
          <Eyebrow tone="hot" glow className="mb-3">
            ─ billets ─
          </Eyebrow>
          <h1 className="text-3xl leading-[1] font-black tracking-[-0.04em] text-ink-700">
            Vérifie ton email d&rsquo;abord.
          </h1>
          <p className="mt-4 text-[15px] leading-[1.5] text-ink-500">
            Pour des raisons de sécurité, les billets ne sont accessibles qu&rsquo;aux comptes dont
            l&rsquo;email a été confirmé. Vérifie ta boîte mail puis recharge la page.
          </p>
        </header>
      </main>
    );
  }

  const isOrganizer = outing.creatorUserId === sessionUserId;

  if (isOrganizer) {
    const [tickets, candidates] = await Promise.all([
      listTicketsForOrganizer(outing.id),
      listTicketRecipientCandidates(outing.id),
    ]);
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <BackLink canonical={canonical} title={outing.title} />

        <header className="mb-8">
          <Eyebrow tone="hot" glow className="mb-3">
            ─ billets ─
          </Eyebrow>
          <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
            Tes billets
            <br />
            pour la sortie.
          </h1>
          <p className="mt-4 text-[15px] leading-[1.5] text-ink-500">
            Uploade un PDF nominatif par participant, ou un seul fichier groupé pour tout le monde.
            Chiffré au repos, accessible uniquement aux comptes avec email vérifié.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          <TicketsOrganizerPanel shortId={outing.shortId} candidates={candidates} />
          <TicketsOrganizerList shortId={outing.shortId} tickets={tickets} />
        </div>
      </main>
    );
  }

  // Mode participant — on cherche la row participants pour cet utilisateur.
  const me = await getMyParticipant({
    outingId: outing.id,
    cookieTokenHash: cookieTokenHash ?? "",
    userId: sessionUserId,
  });
  if (!me) {
    return (
      <NotParticipantNotice
        outingTitle={outing.title}
        canonical={canonical}
        userEmail={session.user.email ?? ""}
      />
    );
  }

  const tickets = await listTicketsForParticipant({
    outingId: outing.id,
    participantId: me.id,
    participantResponse: me.response,
  });

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <BackLink canonical={canonical} title={outing.title} />

      <header className="mb-8">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ mes billets ─
        </Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Récupère
          <br />
          ton billet.
        </h1>
        <p className="mt-4 text-[15px] leading-[1.5] text-ink-500">
          Cliquer sur télécharger ouvre directement le fichier — il est servi déchiffré uniquement à
          toi, et ne s&rsquo;ouvre pas dans le navigateur.
        </p>
      </header>

      <TicketsParticipantList tickets={tickets} />
    </main>
  );
}

function BackLink({ canonical, title }: { canonical: string; title: string }) {
  return (
    <nav className="mb-8">
      <Link
        href={`/${canonical}`}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
        {title}
      </Link>
    </nav>
  );
}
