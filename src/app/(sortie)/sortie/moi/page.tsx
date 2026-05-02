import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { listArchivedOutings } from "@/features/sortie/queries/outing-queries";
import { listFollowers } from "@/features/sortie/queries/follow-queries";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { UsernameForm } from "@/features/sortie/components/username-form";
import { InviteLinkManager } from "@/features/sortie/components/invite-link-manager";
import { FollowerList } from "@/features/sortie/components/follower-list";
import { LoginLink } from "@/features/sortie/components/login-link";
import { UnarchiveButton } from "@/features/sortie/components/unarchive-button";
import { ProfileDetailsForm } from "@/features/sortie/components/profile-details-form";
import { ProfileShareButton } from "@/features/sortie/components/profile-share-button";
import { CopyableHandle } from "@/features/sortie/components/copyable-handle";
import { AvatarPicker } from "@/features/sortie/components/avatar-picker";
import { CalendarFeedManager } from "@/features/sortie/components/calendar-feed-manager";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

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
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
            accueil
          </Link>
        </nav>
        <header className="mb-10">
          <Eyebrow glow className="mb-3">
            ─ mon profil ─
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
            Connexion
            <br />
            requise.
          </h1>
        </header>
        <p className="mb-6 text-[15px] text-ink-500">
          Connecte-toi pour prendre un @nom et afficher tes sorties.
        </p>
        <LoginLink variant="primary" label="Se connecter" />
        <Eyebrow tone="muted" className="mt-4">
          ↳ un email sans mot de passe arrive
        </Eyebrow>
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
      calendarToken: true,
      bio: true,
    },
  });

  const [archived, followers] = await Promise.all([
    listArchivedOutings(session.user.id),
    listFollowers(session.user.id),
  ]);

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
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
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
            className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl"
            style={{ textWrap: "balance" }}
          >
            {name}
          </h1>
          {username ? (
            <div className="flex flex-wrap items-center gap-2">
              <CopyableHandle username={username} origin={origin} />
              <Link
                href={`/@${username}`}
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500 underline-offset-4 hover:text-acid-600 hover:underline"
              >
                profil public
                <ArrowUpRight size={12} strokeWidth={2.4} />
              </Link>
            </div>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
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

      <SectionDivider />
      <SectionHeading
        title="Sorties archivées"
        subtitle={
          archived.length > 0
            ? "Retirées de ton profil public mais visibles pour tes invités. Tu peux les rétablir."
            : "Glisse une sortie vers la gauche depuis ta home pour la cacher de ton profil public."
        }
        action={
          <Link
            href="/agenda"
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition-colors hover:text-acid-600 hover:underline"
          >
            agenda
            <ArrowUpRight size={12} strokeWidth={2.4} />
          </Link>
        }
      />
      <section className="mb-14">
        {archived.length > 0 ? (
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
        ) : (
          <p className="rounded-xl border border-dashed border-surface-400 bg-surface-100/50 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ rien d&rsquo;archivé pour l&rsquo;instant
          </p>
        )}
      </section>

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

          <SectionDivider />
          <SectionHeading
            title="Tes suiveurs"
            subtitle={
              followers.length > 0
                ? "Ils voient tes prochaines sorties dans leur fil. Tu peux retirer un suiveur en deux taps."
                : "Personne ne te suit encore. Partage ton lien privé pour qu'on puisse s'abonner."
            }
          />
          <section className="mb-14">
            <FollowerList followers={followers} />
          </section>
        </>
      )}

      <SectionDivider />
      <SectionHeading
        title="Ton agenda"
        subtitle="Synchronise tes sorties RSVP avec Apple Calendar, Google Calendar ou Outlook."
      />
      <section className="mb-14">
        <CalendarFeedManager initialToken={row?.calendarToken ?? null} origin={origin} />
      </section>
    </main>
  );
}

/**
 * Primary section anchor used across /moi. Title in the display
 * serif, small muted subtitle underneath. Much more present than
 * the 11px coral eyebrow it replaces — was the single biggest cost
 * of readability on this page.
 */
function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-[28px] leading-[1.02] font-black tracking-[-0.03em] text-ink-700">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  );
}

/** Quiet horizontal rule between top-level sections — breathing
 * room + a visual anchor the eye can use to re-orient after a
 * dense form block. */
function SectionDivider() {
  return <hr className="mb-10 border-t border-ink-100" />;
}

type OutingRow = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
};

function OutingRowCard({ outing, muted = false }: { outing: OutingRow; muted?: boolean }) {
  const canonical = outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId;
  return (
    <Link
      href={`/${canonical}`}
      className={`flex flex-col gap-1 rounded-xl border border-surface-400 bg-surface-100 p-3 transition-colors hover:border-acid-600 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <span
        className={`font-display text-[16px] font-bold tracking-[-0.015em] ${muted ? "text-ink-500" : "text-ink-700"}`}
      >
        {outing.title}
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
        {outing.startsAt ? formatOutingDateConversational(outing.startsAt) : "date à définir"}
        {outing.location ? ` · ${formatVenue(outing.location)}` : ""}
      </span>
    </Link>
  );
}
