import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { AgendaHeatmap } from "@/features/sortie/components/agenda-heatmap";
import { AgendaTimeline } from "@/features/sortie/components/agenda-timeline";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { LoginLink } from "@/features/sortie/components/login-link";
import { bucketAgendaByDay, buildMonthGrids } from "@/features/sortie/lib/agenda-grid";
import { listMyAgendaActivity } from "@/features/sortie/queries/outing-queries";

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
  const items = await listMyAgendaActivity(session.user.id, now);
  const buckets = bucketAgendaByDay(items);
  const months = buildMonthGrids(now, buckets);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <BackLink />

      <header className="mb-8">
        <Eyebrow glow className="mb-3">
          ─ ton agenda ─
        </Eyebrow>
        <h1
          className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl"
          style={{ textWrap: "balance" }}
        >
          Ce qui
          <br />
          t&apos;attend.
        </h1>
      </header>

      <Legend />

      <AgendaHeatmap months={months} buckets={buckets} />

      <section className="mt-10">
        <Eyebrow tone="acid" className="mb-4">
          ─ chronologie ─
        </Eyebrow>
        <AgendaTimeline items={items} now={now} />
      </section>
    </main>
  );
}

function Legend() {
  return (
    <div className="mb-6 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="block h-2.5 w-2.5 rounded-sm bg-acid-500/60" />
        datée
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="block h-2.5 w-2.5 rounded-sm bg-hot-500/60" />
        sondage
      </span>
    </div>
  );
}

function BackLink() {
  return (
    <nav className="mb-8">
      <Link
        href="/moi"
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
        profil
      </Link>
    </nav>
  );
}
