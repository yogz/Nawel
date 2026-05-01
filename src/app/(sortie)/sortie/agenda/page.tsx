import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth-config";
import { listMyUpcomingForAgenda } from "@/features/sortie/queries/outing-queries";
import {
  bucketForOuting,
  daysUntilParis,
  jLabel,
  BUCKET_ORDER,
  type AgendaBucket,
} from "@/features/sortie/lib/agenda-buckets";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { LoginLink } from "@/features/sortie/components/login-link";
import {
  AgendaTimeline,
  type AgendaData,
  type TicketVM,
} from "@/features/sortie/components/agenda-timeline";

export const metadata = {
  title: "Ton agenda",
  robots: { index: false, follow: false },
};

export default async function AgendaPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <BackLink />
        <header className="mb-10">
          <Eyebrow glow className="mb-3">
            ─ ton agenda ─
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
            Connexion
            <br />
            requise.
          </h1>
        </header>
        <p className="mb-6 text-[15px] text-ink-500">Connecte-toi pour voir tes sorties à venir.</p>
        <LoginLink variant="primary" label="Se connecter" />
      </main>
    );
  }

  const now = new Date();
  const rows = await listMyUpcomingForAgenda(session.user.id, now);

  // Bucketing déterministe côté serveur. `now` capturé une seule fois,
  // partagé entre bucket et compte de jours pour rester cohérent (sinon
  // une sortie à minuit pile pourrait être bucketée "today" mais avec
  // J-1 dans la colonne mono).
  const groupsMap = new Map<AgendaBucket, TicketVM[]>();

  // Le premier billet datable rencontré (ordre SQL ASC NULLS LAST)
  // décroche le tag `next up`. Un seul par page.
  let nextUpAssigned = false;

  for (const row of rows) {
    const bucket = bucketForOuting(row.startsAt, now);
    const days = daysUntilParis(row.startsAt, now);
    const isNextUp = !nextUpAssigned && row.startsAt !== null;
    if (isNextUp) {
      nextUpAssigned = true;
    }
    const ticket: TicketVM = {
      id: row.id,
      shortId: row.shortId,
      slug: row.slug,
      title: row.title,
      location: row.location,
      startsAt: row.startsAt,
      heroImageUrl: row.heroImageUrl,
      confirmedCount: row.confirmedCount,
      daysUntil: days,
      jLabel: jLabel(days),
      isNextUp,
    };
    const list = groupsMap.get(bucket) ?? [];
    list.push(ticket);
    groupsMap.set(bucket, list);
  }

  const groups = BUCKET_ORDER.filter((b) => (groupsMap.get(b)?.length ?? 0) > 0).map((bucket) => ({
    bucket,
    items: groupsMap.get(bucket)!,
  }));

  const totalCount = rows.length;
  const tbdCount = groupsMap.get("tbd")?.length ?? 0;
  const datedCount = totalCount - tbdCount;

  const data: AgendaData = {
    groups,
    totalCount,
    datedCount,
    tbdCount,
    now: now.toISOString(),
  };

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <BackLink />

      <header className="mb-10">
        <Eyebrow glow className="mb-3">
          ─ ton agenda ─
        </Eyebrow>
        <h1
          className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl"
          style={{ textWrap: "balance" }}
        >
          Ce qui
          <br />
          t'attend.
        </h1>
        {totalCount > 0 && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ {datedCount} datée{datedCount > 1 ? "s" : ""}
            {tbdCount > 0 && ` · ${tbdCount} à programmer`}
          </p>
        )}
      </header>

      <AgendaTimeline data={data} />
    </main>
  );
}

function BackLink() {
  return (
    <nav className="mb-8">
      <Link
        href="/sortie/moi"
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
        profil
      </Link>
    </nav>
  );
}
