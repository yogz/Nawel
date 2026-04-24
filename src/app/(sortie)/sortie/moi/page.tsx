import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import {
  listArchivedOutings,
  listPublicProfileOutings,
} from "@/features/sortie/queries/outing-queries";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { UsernameForm } from "@/features/sortie/components/username-form";
import { InviteLinkManager } from "@/features/sortie/components/invite-link-manager";
import { LoginLink } from "@/features/sortie/components/login-link";
import { ArchivableOutingList } from "@/features/sortie/components/archivable-outing-list";
import { UnarchiveButton } from "@/features/sortie/components/unarchive-button";

export const metadata = {
  title: "Mon profil",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <nav className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Accueil
          </Link>
        </nav>
        <header className="mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
            Mon profil
          </p>
          <h1 className="font-serif text-4xl leading-tight text-encre-700">Connexion requise</h1>
        </header>
        <p className="mb-6 text-sm text-encre-500">
          Connecte-toi pour prendre un @nom et afficher tes sorties.
        </p>
        <LoginLink variant="primary" label="Se connecter" />
        <p className="mt-4 text-xs text-encre-400">
          Un email sans mot de passe t&rsquo;arrivera. Tu reviendras ici une fois connecté·e.
        </p>
      </main>
    );
  }

  const row = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { id: true, name: true, username: true, rsvpInviteToken: true },
  });

  const { upcoming, past } = await listPublicProfileOutings(session.user.id);
  const archived = await listArchivedOutings(session.user.id);

  // Build the absolute origin from request headers so dev (sortie.localhost)
  // and prod (sortie.colist.fr) both produce a correct shareable URL without
  // plumbing SORTIE_BASE_URL through every environment.
  const host = h.get("host") ?? "sortie.colist.fr";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Accueil
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
          Mon profil
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">
          {row?.name ?? "Anonyme"}
        </h1>
        {row?.username && (
          <p className="mt-3 text-sm text-encre-500">
            <Link
              href={`/@${row.username}`}
              className="text-bordeaux-700 underline-offset-4 hover:underline"
            >
              sortie.colist.fr/@{row.username}
            </Link>
          </p>
        )}
      </header>

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-encre-700">Nom d&rsquo;utilisateur</h2>
        <UsernameForm currentUsername={row?.username ?? null} />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-encre-700">Lien privé pour tes amis</h2>
        {row?.username ? (
          <InviteLinkManager
            username={row.username}
            token={row.rsvpInviteToken ?? null}
            origin={origin}
          />
        ) : (
          <p className="text-sm text-encre-400">
            Choisis d&rsquo;abord un nom d&rsquo;utilisateur pour générer ton lien privé.
          </p>
        )}
      </section>

      {(upcoming.length > 0 || past.length > 0 || archived.length > 0) && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-encre-700">Mes sorties visibles</h2>
          <p className="mb-4 text-xs text-encre-400">
            Glisse à gauche pour archiver. La sortie quitte ton profil, les invités la voient
            toujours.
          </p>
          {upcoming.length > 0 && (
            <OutingListBlock title="À venir" rows={upcoming} isPast={false} />
          )}
          {past.length > 0 && <OutingListBlock title="Passées" rows={past} isPast />}
          {archived.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-encre-400">
                Archivées
              </p>
              <ul className="flex flex-col gap-2">
                {archived.map((o) => (
                  <li key={o.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <OutingRowCard outing={o} muted />
                    </div>
                    <UnarchiveButton shortId={o.shortId} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

type OutingRow = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
};

function OutingListBlock({
  title,
  rows,
  isPast,
}: {
  title: string;
  rows: OutingRow[];
  isPast: boolean;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
        {title}
      </p>
      <ArchivableOutingList
        items={rows.map((o) => ({ row: o, node: <OutingRowCard outing={o} /> }))}
        isPast={isPast}
        listClassName="flex flex-col gap-2"
      />
    </div>
  );
}

function OutingRowCard({ outing, muted = false }: { outing: OutingRow; muted?: boolean }) {
  const canonical = outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId;
  return (
    <Link
      href={`/${canonical}`}
      className={`flex flex-col gap-0.5 rounded-xl border bg-ivoire-50 p-3 transition-colors hover:border-or-500 ${
        muted ? "border-ivoire-300 opacity-75" : "border-ivoire-400"
      }`}
    >
      <span className={`text-sm font-medium ${muted ? "text-encre-500" : "text-encre-700"}`}>
        {outing.title}
      </span>
      <span className="text-xs text-encre-400">
        {outing.startsAt ? formatOutingDateConversational(outing.startsAt) : "Date à définir"}
        {outing.location ? ` · ${outing.location}` : ""}
      </span>
    </Link>
  );
}
