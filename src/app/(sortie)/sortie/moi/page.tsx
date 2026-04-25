import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import {
  listArchivedOutings,
  listPublicProfileOutings,
} from "@/features/sortie/queries/outing-queries";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { UsernameForm } from "@/features/sortie/components/username-form";
import { InviteLinkManager } from "@/features/sortie/components/invite-link-manager";
import { LoginLink } from "@/features/sortie/components/login-link";
import { ArchivableOutingList } from "@/features/sortie/components/archivable-outing-list";
import { UnarchiveButton } from "@/features/sortie/components/unarchive-button";
import { ProfileDetailsForm } from "@/features/sortie/components/profile-details-form";
import { ProfileShareButton } from "@/features/sortie/components/profile-share-button";
import { CopyableHandle } from "@/features/sortie/components/copyable-handle";
import { AvatarPicker } from "@/features/sortie/components/avatar-picker";

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
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-600"
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
            accueil
          </Link>
        </nav>
        <header className="mb-10">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
            />
            ─ mon profil ─
          </p>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700">
            Connexion
            <br />
            requise.
          </h1>
        </header>
        <p className="mb-6 text-[15px] text-encre-500">
          Connecte-toi pour prendre un @nom et afficher tes sorties.
        </p>
        <LoginLink variant="primary" label="Se connecter" />
        <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
          ↳ un email sans mot de passe arrive
        </p>
      </main>
    );
  }

  const row = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      id: true,
      name: true,
      image: true,
      username: true,
      rsvpInviteToken: true,
      bio: true,
    },
  });

  const { upcoming, past } = await listPublicProfileOutings(session.user.id);
  const archived = await listArchivedOutings(session.user.id);

  // Build the absolute origin from request headers so dev (sortie.localhost)
  // and prod (sortie.colist.fr) both produce a correct shareable URL without
  // plumbing SORTIE_BASE_URL through every environment.
  const host = h.get("host") ?? "sortie.colist.fr";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const name = row?.name ?? session.user.name ?? "Anonyme";
  const image = row?.image ?? null;
  const username = row?.username ?? null;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          accueil
        </Link>
        {username && <ProfileShareButton url={`${origin}/@${username}`} name={name} />}
      </nav>

      <header className="mb-12 flex flex-col items-start gap-5">
        <AvatarPicker name={name} image={image} size={96} />
        <div className="flex flex-col items-start gap-3">
          <h1
            className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl"
            style={{ textWrap: "balance" }}
          >
            {name}
          </h1>
          {username ? (
            <div className="flex flex-wrap items-center gap-2">
              <CopyableHandle username={username} origin={origin} />
              <Link
                href={`/@${username}`}
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-500 underline-offset-4 hover:text-bordeaux-600 hover:underline"
              >
                profil public
                <ArrowUpRight size={12} strokeWidth={2.4} />
              </Link>
            </div>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
              ↳ choisis un @nom plus bas pour activer ton profil
            </p>
          )}
        </div>
      </header>

      <SectionHeading
        title="Ton profil"
        subtitle="Ce que les autres voient quand ils tapent sur ton @handle."
      />
      <section className="mb-14">
        <div className="flex flex-col gap-4">
          <UsernameForm currentUsername={username} />
          <ProfileDetailsForm bio={row?.bio ?? null} />
        </div>
      </section>

      {(upcoming.length > 0 || past.length > 0 || archived.length > 0) && (
        <>
          <SectionDivider />
          <SectionHeading
            title="Tes sorties"
            subtitle="Glisse une sortie à gauche pour l’archiver. L’archiver la retire de ton profil, jamais des invités."
          />
          <section className="mb-14">
            {upcoming.length > 0 && (
              <OutingListBlock title="À venir" rows={upcoming} isPast={false} />
            )}
            {past.length > 0 && <OutingListBlock title="Passées" rows={past} isPast />}
            {archived.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
                  ─ archivées ─
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
        </>
      )}

      {username && (
        <>
          <SectionDivider />
          <SectionHeading
            title="Ton lien privé"
            subtitle="Tes amis RSVP direct à toutes tes sorties depuis une seule URL secrète."
          />
          <section className="mb-14">
            <InviteLinkManager
              username={username}
              token={row?.rsvpInviteToken ?? null}
              origin={origin}
            />
          </section>
        </>
      )}
    </main>
  );
}

/**
 * Primary section anchor used across /moi. Title in the display
 * serif, small muted subtitle underneath. Much more present than
 * the 11px coral eyebrow it replaces — was the single biggest cost
 * of readability on this page.
 */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[28px] leading-[1.02] font-black tracking-[-0.03em] text-encre-700">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
          ↳ {subtitle}
        </p>
      )}
    </div>
  );
}

/** Quiet horizontal rule between top-level sections — breathing
 * room + a visual anchor the eye can use to re-orient after a
 * dense form block. */
function SectionDivider() {
  return <hr className="mb-10 border-t border-encre-100" />;
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
      <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-500">
        ─ {title.toLowerCase()} ─
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
      className={`flex flex-col gap-1 rounded-xl border border-ivoire-400 bg-ivoire-100 p-3 transition-colors hover:border-bordeaux-600 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <span
        className={`text-[16px] font-bold tracking-[-0.015em] ${muted ? "text-encre-500" : "text-encre-700"}`}
        style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
      >
        {outing.title}
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-encre-400">
        {outing.startsAt ? formatOutingDateConversational(outing.startsAt) : "date à définir"}
        {outing.location ? ` · ${formatVenue(outing.location)}` : ""}
      </span>
    </Link>
  );
}
