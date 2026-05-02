import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { AgendaView } from "@/features/sortie/components/agenda-view";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { LoginLink } from "@/features/sortie/components/login-link";
import { listMyAgendaActivity } from "@/features/sortie/queries/outing-queries";

export const metadata = {
  title: "Ton agenda",
  robots: { index: false, follow: false },
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  // Back contextuel : la home pousse `?from=home` sur le lien "vue
  // détaillée". On retombe sur /moi sinon (entrée par bookmark, profil).
  const fromHome = (await searchParams).from === "home";
  const back = fromHome ? { href: "/", label: "accueil" } : { href: "/moi", label: "profil" };

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <BackLink href={back.href} label={back.label} />
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

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <BackLink href={back.href} label={back.label} />

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

      <AgendaView items={items} nowIso={now.toISOString()} />
    </main>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <nav className="mb-8">
      <Link
        href={href}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
      >
        <ArrowLeft size={14} strokeWidth={2.2} />
        {label}
      </Link>
    </nav>
  );
}
