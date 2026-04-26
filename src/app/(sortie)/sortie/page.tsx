import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import {
  ChevronRight,
  Film,
  Image as ImageIcon,
  Mic2,
  MoreHorizontal,
  Music,
  Plus,
  Theater,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";
import { listAllMyOutings } from "@/features/sortie/queries/outing-queries";
import { LoginLink } from "@/features/sortie/components/login-link";
import { UserAvatar } from "@/features/sortie/components/user-avatar";
import { LiveStatusHero } from "@/features/sortie/components/live-status-hero";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type HomeOutingRow = Awaited<ReturnType<typeof listAllMyOutings>>["upcoming"][number];

export default async function SortieHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  if (!userId || !session) {
    return <PublicHome />;
  }

  const { upcoming, past } = await listAllMyOutings(userId);
  const next = upcoming[0] ?? null;

  // Headline needs a headcount for the next outing — fetch once from the
  // participants table and compute yes/total in memory (tiny rows, fine).
  let nextStats: { confirmed: number; total: number } | null = null;
  if (next) {
    const rows = await db
      .select({ response: participants.response })
      .from(participants)
      .where(eq(participants.outingId, next.id));
    nextStats = {
      confirmed: rows.filter((r) => r.response === "yes").length,
      total: rows.filter((r) => r.response !== "no").length,
    };
  }

  // Read the avatar from the DB rather than the session: Better Auth caches
  // `session.user.image` in the cookie at sign-in time, so a fresh upload
  // doesn't propagate to the nav avatar until the session is renewed. The
  // /moi page already follows this pattern (it queries the user row for
  // `image`), this keeps the home nav consistent.
  const userRow = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { image: true },
  });
  const avatarImage = userRow?.image ?? session.user.image ?? null;

  const firstName = session.user.name?.split(" ")[0] ?? "Toi";
  const restUpcoming = upcoming.slice(1);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 pb-32 pt-6">
      <nav className="mb-8 flex items-center justify-end">
        <Link
          href="/moi"
          aria-label="Mon profil"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ivoire-50"
        >
          <UserAvatar name={session.user.name} image={avatarImage} size={44} />
        </Link>
      </nav>

      {next && next.startsAt && nextStats ? (
        <>
          {/* Personal anchor: this used to disappear the moment a user had
              an upcoming outing, exactly when the page felt most data-rich
              and least personal. Keeping it small + muted so it sets the
              tone without competing with the LiveStatusHero headline. */}
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
            <span aria-hidden>◉</span>
            salut {firstName.toLowerCase()}
          </p>
          <LiveStatusHero
            slug={next.slug}
            shortId={next.shortId}
            title={next.title}
            location={next.location}
            startsAt={next.startsAt}
            confirmed={nextStats.confirmed}
            total={nextStats.total}
            heroImageUrl={next.heroImageUrl}
            headingLevel="h1"
          />
        </>
      ) : upcoming.length > 0 ? (
        <header className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
            />
            ─ ta liste ─
          </p>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl">
            Salut {firstName}.
          </h1>
          <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-encre-400">
            {String(upcoming.length).padStart(2, "0")}{" "}
            {upcoming.length > 1 ? "sorties on the wire" : "sortie on the wire"}
          </p>
        </header>
      ) : (
        <EmptyHeroWithVibes firstName={firstName} />
      )}

      {restUpcoming.length > 0 && (
        <section className="mt-4 mb-10">
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-600">
            ─ à venir ─
          </p>
          <ul className="flex flex-col gap-4">
            {restUpcoming.map((o, index) => (
              // Stagger via inline `animation-delay` rather than a JS
              // orchestrator — keeps the list server-rendered, the
              // animation is pure CSS triggered on first paint.
              // Capped at index 9 so a 30-event organiser doesn't sit
              // through 1.2s of waterfall before the last card lands.
              <li
                key={o.id}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized"
                style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
              >
                <OutingProfileCard
                  outing={o}
                  showRsvp={false}
                  myRsvp={null}
                  loggedInName={session.user.name ?? null}
                  outingBaseUrl={PUBLIC_BASE}
                  isPast={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && <PastSection outings={past} loggedInName={session.user.name ?? null} />}

      {/* Floating CTA: sticky bottom-right. The 1rem additive on top of the
          safe-area inset is what keeps it clear of Safari's bottom URL bar
          on iOS — the inset only accounts for the 34pt home indicator,
          not the browser chrome that lives above it. Material 3 specifies
          16dp (≈ 1rem) from the edge for a primary FAB; we sit at 1.5rem
          minimum so the icon-only button feels deliberate at 360px width
          and the right edge of list cards never overlaps it. */}
      <Link
        href="/nouvelle"
        aria-label="Nouvelle sortie"
        style={{
          bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))",
        }}
        className="fixed right-5 z-50 inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-lg)] transition-transform hover:scale-105 hover:bg-bordeaux-700 motion-safe:active:scale-95 sm:right-8 sm:w-auto sm:justify-start sm:pr-6 sm:pl-5"
      >
        <Plus size={22} strokeWidth={2.5} />
        <span className="hidden text-base font-semibold sm:inline">Nouvelle sortie</span>
      </Link>
    </main>
  );
}

/**
 * Past outings: mirrors the /@<username> pattern — up to 3 inline, rest
 * hidden behind "Voir les N autres ›". Keeps short histories flat
 * without demoting them, and spares multi-year organisers from a wall
 * of past cards every time they land on /.
 */
function PastSection({
  outings,
  loggedInName,
}: {
  outings: HomeOutingRow[];
  loggedInName: string | null;
}) {
  const inline = outings.slice(0, 3);
  const hidden = outings.slice(3);

  return (
    <section className="mb-10">
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-600">
        ─ passées ─
      </p>
      <ul className="flex flex-col gap-4">
        {inline.map((o) => (
          <li key={o.id}>
            <OutingProfileCard
              outing={o}
              showRsvp={false}
              myRsvp={null}
              loggedInName={loggedInName}
              outingBaseUrl={PUBLIC_BASE}
              isPast
            />
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <details className="group mt-4 border-t border-encre-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:text-bordeaux-600">
            <span>+ voir les {String(hidden.length).padStart(2, "0")} autres</span>
            <ChevronRight
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-90"
            />
          </summary>
          <ul className="mt-4 flex flex-col gap-4">
            {hidden.map((o) => (
              <li key={o.id}>
                <OutingProfileCard
                  outing={o}
                  showRsvp={false}
                  myRsvp={null}
                  loggedInName={loggedInName}
                  outingBaseUrl={PUBLIC_BASE}
                  isPast
                />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function EmptyHeroWithVibes({ firstName }: { firstName: string }) {
  return (
    <>
      <header className="mb-10">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ idle. choisis ton ambiance ─
        </p>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl">
          Salut {firstName}.
        </h1>
        <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-encre-400">
          C&rsquo;est quoi le programme&nbsp;?
        </p>
      </header>
      <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <VibeButton
          href="/nouvelle?vibe=theatre"
          icon={<Theater size={28} />}
          label="Théâtre"
          bg="#C7FF3C"
          fg="#0A0A0A"
        />
        <VibeButton
          href="/nouvelle?vibe=opera"
          icon={<Mic2 size={28} />}
          label="Opéra"
          bg="#FF3D81"
          fg="#0A0A0A"
        />
        <VibeButton
          href="/nouvelle?vibe=concert"
          icon={<Music size={28} />}
          label="Concert"
          bg="#FFD93D"
          fg="#0A0A0A"
        />
        <VibeButton
          href="/nouvelle?vibe=cine"
          icon={<Film size={28} />}
          label="Ciné"
          bg="#7C5CFF"
          fg="#FFFFFF"
        />
        <VibeButton
          href="/nouvelle?vibe=expo"
          icon={<ImageIcon size={28} />}
          label="Expo"
          bg="#FF7733"
          fg="#0A0A0A"
        />
        <VibeButton
          href="/nouvelle"
          icon={<MoreHorizontal size={28} />}
          label="Autre"
          bg="#1F1F1F"
          fg="#F5F2EB"
        />
      </div>
    </>
  );
}

function VibeButton({
  href,
  icon,
  label,
  bg,
  fg,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <Link
      href={href}
      style={{ backgroundColor: bg, color: fg }}
      className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[24px] p-4 shadow-[var(--shadow-md)] transition-transform duration-[var(--dur-fast)] motion-safe:active:scale-95 active:rotate-[-1deg]"
    >
      <span style={{ color: fg }}>{icon}</span>
      <span
        className="text-[20px] font-black leading-[0.95] tracking-[-0.025em]"
        style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
      >
        {label}
      </span>
    </Link>
  );
}

function PublicHome() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-6 pb-12 pt-[max(env(safe-area-inset-top),2rem)]">
      {/* Ambient acid glow on the top-right corner — sets the mood the
          moment the page paints. The radial gradient sits behind the
          content layer at low opacity so it never trips contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 95% 0%, rgba(199,255,60,0.18) 0%, transparent 45%), radial-gradient(circle at 5% 95%, rgba(255,61,129,0.14) 0%, transparent 50%)",
        }}
      />

      <header className="flex flex-1 flex-col items-start justify-center">
        <p className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          sortie · v0.1
        </p>
        <h1
          className="mb-6 text-[52px] leading-[0.92] font-black tracking-[-0.04em] text-encre-700 sm:text-[64px]"
          style={{ textWrap: "balance" }}
        >
          Organise.
          <br />
          Ils répondent.
          <br />
          <span className="text-bordeaux-600">Tu sais.</span>
        </h1>
        <p className="mb-10 max-w-md text-[17px] leading-[1.5] text-encre-400">
          Tu lances la sortie, tout le monde répond d&rsquo;un tap. Qui vient, qui prend les places,
          qui rembourse combien.{" "}
          <span className="text-encre-700">Tout d&rsquo;un coup d&rsquo;œil.</span>
        </p>

        <Link
          href="/nouvelle"
          className="group inline-flex items-center gap-2 rounded-full bg-bordeaux-600 px-7 py-4 text-[17px] font-black text-encre-50 shadow-[var(--shadow-acid)] transition-transform duration-[var(--dur-fast)] hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Lancer une sortie
          <span
            aria-hidden
            className="transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>

        <LoginLink
          className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-encre-500 hover:text-encre-700"
          label="j&rsquo;ai déjà un compte →"
        />
      </header>
    </main>
  );
}
