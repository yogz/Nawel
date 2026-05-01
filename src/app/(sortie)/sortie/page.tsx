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
import {
  listAllMyOutings,
  listAnonInboxOutings,
  listMyParticipantsForOutings,
  type MyParticipantWithSlots,
} from "@/features/sortie/queries/outing-queries";
import { bucketizeUpcoming, sortUpcomingByStartsAt } from "@/features/sortie/lib/upcoming-buckets";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { LoginLink } from "@/features/sortie/components/login-link";
import { UserAvatar } from "@/features/sortie/components/user-avatar";
import { LiveStatusHero } from "@/features/sortie/components/live-status-hero";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { PendingActionsStrip } from "@/features/sortie/components/pending-actions-strip";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { computePendingActions } from "@/features/sortie/lib/pending-actions";
import { LandingV2 } from "@/features/sortie/components/landing/landing-v2";
import { ResetDeviceTrigger } from "@/features/sortie/components/reset-device-trigger";
import { resolveMyRsvp } from "@/features/sortie/lib/resolve-my-rsvp";
import { getResetReclaimability } from "@/features/sortie/queries/reset-device-queries";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type HomeOutingRow = Awaited<ReturnType<typeof listAllMyOutings>>["upcoming"][number];

export default async function SortieHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  if (!userId || !session) {
    // Avant de servir le landing générique, on regarde si le visiteur
    // est un anon déjà connu via son cookie token (a répondu à au
    // moins une sortie via un lien partagé). Si oui, on lui ramène
    // ses sorties — beaucoup plus utile qu'un "Organise. Ils
    // répondent." quand il a déjà l'app dans son contexte.
    const cookieTokenHash = await readParticipantTokenHash();
    if (cookieTokenHash) {
      const [inbox, reclaim] = await Promise.all([
        listAnonInboxOutings(cookieTokenHash),
        getResetReclaimability(cookieTokenHash),
      ]);
      if (inbox.upcoming.length > 0 || inbox.past.length > 0) {
        return <AnonInbox inbox={inbox} reclaim={reclaim} />;
      }
    }
    return <LandingV2 />;
  }

  const { upcoming: upcomingRaw, past } = await listAllMyOutings(userId);
  // Charge les participations du user sur ses outings (créations +
  // celles où il a RSVP). Sans ça, l'eyebrow d'état "✓ Tu viens / ✓
  // Tu as voté" ne s'affiche pas sur la home logged-in et un user
  // qui est principalement participant (pas créateur) ne sait pas
  // qu'il a déjà répondu.
  const myRsvpByOuting = await listMyParticipantsForOutings({
    outingIds: [...upcomingRaw, ...past].map((o) => o.id),
    cookieTokenHash: null,
    userId,
  });
  // La query renvoie en `desc(createdAt)` par défaut — ce qui n'a aucun
  // sens côté UX dès qu'on a > 5 sorties (un événement loin créé hier
  // remonte avant un événement proche créé la semaine dernière). On
  // re-trie ici par `startsAt` ascendant pour que la home reflète
  // l'horizon temporel et non l'ordre de création.
  const upcoming = sortUpcomingByStartsAt(upcomingRaw);
  // Le hero exige une date concrète — on choisit donc la prochaine sortie
  // *avec* startsAt comme candidate hero, pas juste `upcoming[0]`. Sinon
  // un sondage en cours (startsAt null) volait la place du hero, n'était
  // pas rendu (le hero refuse les undated), et disparaissait aussi du
  // bucket "date à voter" parce qu'on faisait `upcoming.slice(1)`.
  const heroOuting = upcoming.find((o) => o.startsAt !== null) ?? null;

  // Headline needs a headcount for the next outing — fetch once from the
  // participants table and compute yes/total in memory (tiny rows, fine).
  let heroStats: { confirmed: number; total: number } | null = null;
  if (heroOuting) {
    const rows = await db
      .select({ response: participants.response })
      .from(participants)
      .where(eq(participants.outingId, heroOuting.id));
    heroStats = {
      // `handle_own` = vient avec son propre billet. Sémantiquement confirmé,
      // pas en attente — aligné avec emails J-1, dettes, achats, page détail.
      confirmed: rows.filter((r) => r.response === "yes" || r.response === "handle_own").length,
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
  const restUpcoming = heroOuting ? upcoming.filter((o) => o.id !== heroOuting.id) : upcoming;

  // Inbox d'actions transverses : ce que la home doit dire au user
  // *en plus* du hero. On exclut la sortie déjà héro-isée — son
  // countdown et CTA portent déjà la nudge, doublonner ajoute du bruit.
  // Ne charge rien de plus côté DB : tout dérivable des outings + RSVP
  // déjà fetchés.
  const pendingActions = computePendingActions({
    outings: upcoming,
    userId,
    myRsvpByOuting,
    excludeOutingId: heroOuting?.id ?? null,
  });

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 pb-32 pt-6">
      <nav className="mb-8 flex items-center justify-end">
        <Link
          href="/moi"
          aria-label="Mon profil"
          className="rounded-full ring-1 ring-acid-600/55 transition-all duration-300 hover:ring-acid-600/80 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
        >
          <UserAvatar name={session.user.name} image={avatarImage} size={44} />
        </Link>
      </nav>

      <PendingActionsStrip actions={pendingActions} />

      {heroOuting && heroOuting.startsAt && heroStats ? (
        <>
          {/* Personal anchor: this used to disappear the moment a user had
              an upcoming outing, exactly when the page felt most data-rich
              and least personal. Keeping it small + muted so it sets the
              tone without competing with the LiveStatusHero headline. */}
          <Eyebrow tone="muted" className="mb-3 inline-flex items-center gap-2">
            <span aria-hidden>◉</span>
            salut {firstName.toLowerCase()}
          </Eyebrow>
          <LiveStatusHero
            slug={heroOuting.slug}
            shortId={heroOuting.shortId}
            title={heroOuting.title}
            location={heroOuting.location}
            startsAt={heroOuting.startsAt}
            confirmed={heroStats.confirmed}
            total={heroStats.total}
            heroImageUrl={heroOuting.heroImageUrl}
            deadlineAt={heroOuting.deadlineAt}
            status={heroOuting.status}
            mode={heroOuting.mode}
            headingLevel="h1"
          />
        </>
      ) : upcoming.length > 0 ? (
        <header className="mb-12">
          <Eyebrow glow className="mb-3">
            ─ ta liste ─
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
            Salut {firstName}.
          </h1>
          <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-ink-400">
            {String(upcoming.length).padStart(2, "0")}{" "}
            {upcoming.length > 1 ? "sorties on the wire" : "sortie on the wire"}
          </p>
        </header>
      ) : (
        <EmptyHeroWithVibes firstName={firstName} />
      )}

      {restUpcoming.length > 0 && (
        <UpcomingBuckets
          outings={restUpcoming}
          loggedInName={session.user.name ?? null}
          myRsvpByOuting={myRsvpByOuting}
        />
      )}

      {past.length > 0 && (
        <PastSection
          outings={past}
          loggedInName={session.user.name ?? null}
          myRsvpByOuting={myRsvpByOuting}
        />
      )}

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
        className="fixed right-5 z-50 inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-acid-600 text-surface-50 shadow-[var(--shadow-lg)] transition-transform hover:scale-105 hover:bg-acid-700 motion-safe:active:scale-95 sm:right-8 sm:w-auto sm:justify-start sm:pr-6 sm:pl-5"
      >
        <Plus size={22} strokeWidth={2.5} />
        <span className="hidden text-base font-semibold sm:inline">Nouvelle sortie</span>
      </Link>
    </main>
  );
}

/**
 * Upcoming outings groupées par horizon temporel (cette semaine / ce
 * mois-ci / plus tard / date à voter). Garde les buckets vides muets
 * pour ne pas afficher de header sans contenu — un user qui n'a que des
 * sorties dans 3 mois voit un seul header "plus tard", pas trois headers
 * vides au-dessus.
 *
 * Stagger d'animation continu d'un bucket au suivant : on prend l'index
 * absolu dans la liste (et pas l'index local au bucket) pour éviter la
 * cassure rythmique quand la première carte de chaque section repart à
 * `delay: 0` et que tout le bloc surgit en même temps.
 */
function UpcomingBuckets({
  outings,
  loggedInName,
  myRsvpByOuting,
}: {
  outings: HomeOutingRow[];
  loggedInName: string | null;
  myRsvpByOuting: Map<string, MyParticipantWithSlots>;
}) {
  const buckets = bucketizeUpcoming(outings).filter((b) => b.outings.length > 0);
  // Pré-calcule l'index absolu de la première carte de chaque bucket.
  // On évite ainsi la mutation d'un `let` à l'intérieur du `.map()` JSX,
  // que le React Compiler refuse (impureté pendant le render). Le delay
  // de chaque carte se calcule ensuite par `baseIndex + indexLocal`.
  const baseIndices: number[] = [];
  buckets.reduce((acc, b) => {
    baseIndices.push(acc);
    return acc + b.outings.length;
  }, 0);

  return (
    <div className="mt-4 mb-10 flex flex-col gap-8">
      {buckets.map((bucket, bIdx) => {
        const baseIndex = baseIndices[bIdx] ?? 0;
        return (
          <section key={bucket.key}>
            <Eyebrow tone="hot" className="mb-3 flex items-center gap-2 text-hot-600">
              <span>─ {bucket.label} ─</span>
              <span className="text-ink-400">{String(bucket.outings.length).padStart(2, "0")}</span>
            </Eyebrow>
            <ul className="flex flex-col gap-4">
              {bucket.outings.map((o, oIdx) => (
                <li
                  key={o.id}
                  className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized"
                  style={{ animationDelay: `${Math.min(baseIndex + oIdx, 9) * 40}ms` }}
                >
                  <OutingProfileCard
                    outing={o}
                    showRsvp
                    myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id), loggedInName)}
                    loggedInName={loggedInName}
                    outingBaseUrl={PUBLIC_BASE}
                    isPast={false}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
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
  myRsvpByOuting,
}: {
  outings: HomeOutingRow[];
  loggedInName: string | null;
  myRsvpByOuting: Map<string, MyParticipantWithSlots>;
}) {
  const inline = outings.slice(0, 3);
  const hidden = outings.slice(3);

  return (
    <section className="mb-10">
      <Eyebrow tone="hot" className="mb-3 text-hot-600">
        ─ passées ─
      </Eyebrow>
      <ul className="flex flex-col gap-4">
        {inline.map((o) => (
          <li key={o.id}>
            <OutingProfileCard
              outing={o}
              showRsvp={false}
              myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id), loggedInName)}
              loggedInName={loggedInName}
              outingBaseUrl={PUBLIC_BASE}
              isPast
            />
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <details className="group mt-4 border-t border-ink-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-acid-600">
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
                  myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id), loggedInName)}
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
        <Eyebrow glow className="mb-3">
          ─ idle. choisis ton ambiance ─
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
          Salut {firstName}.
        </h1>
        <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-ink-400">
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
      className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[24px] p-4 shadow-[var(--shadow-md)] transition-transform [transition-duration:var(--dur-fast)] motion-safe:active:scale-95 active:rotate-[-1deg]"
    >
      <span style={{ color: fg }}>{icon}</span>
      <span className="font-display text-[20px] font-black leading-[0.95] tracking-[-0.025em]">
        {label}
      </span>
    </Link>
  );
}

/**
 * Vue "anonyme reconnu" : un visiteur sans session mais avec un cookie
 * token qui a déjà participé à au moins une sortie. Pas de hero (le
 * mode est "checklist d'engagements", pas "vitrine"), pas d'avatar
 * nav (l'identité serveur n'a pas de profil utilisateur). Les cards
 * affichent le RSVP inline pour qu'il puisse modifier sa réponse en
 * 1 tap, comme sur le profil organisateur en mode invité (?k=…).
 *
 * Push login en bas pour qu'il puisse récupérer son historique sur
 * un autre device sans le perdre — la friction est volontairement
 * basse (lien tertiaire underline mono), pas de bandeau qui crie.
 */
function AnonInbox({
  inbox,
  reclaim,
}: {
  inbox: Awaited<ReturnType<typeof listAnonInboxOutings>>;
  reclaim: Awaited<ReturnType<typeof getResetReclaimability>>;
}) {
  const upcomingSorted = sortUpcomingByStartsAt(inbox.upcoming);
  const myRsvpByOuting = inbox.myRsvpByOuting;
  const greeting = inbox.anonName ? `Salut ${inbox.anonName}.` : "Tes sorties.";
  const totalUpcoming = upcomingSorted.length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 pb-32 pt-10">
      <header className="mb-10">
        <Eyebrow glow className="mb-3">
          ─ ton inbox ─
        </Eyebrow>
        <h1
          className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl"
          style={{ textWrap: "balance" }}
        >
          {greeting}
        </h1>
        {totalUpcoming > 0 && (
          <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.18em] text-ink-400">
            {String(totalUpcoming).padStart(2, "0")}{" "}
            {totalUpcoming > 1 ? "sorties à venir" : "sortie à venir"}
          </p>
        )}
      </header>

      {upcomingSorted.length > 0 && (
        <section className="mb-10">
          <Eyebrow tone="hot" className="mb-3 text-hot-600">
            ─ à venir ─
          </Eyebrow>
          <ul className="flex flex-col gap-4">
            {upcomingSorted.map((o) => (
              <li key={o.id}>
                <OutingProfileCard
                  outing={o}
                  showRsvp
                  myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id))}
                  loggedInName={null}
                  outingBaseUrl={PUBLIC_BASE}
                  isPast={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {inbox.past.length > 0 && (
        <section className="mb-10">
          <Eyebrow tone="hot" className="mb-3 text-hot-600">
            ─ passées ─
          </Eyebrow>
          <ul className="flex flex-col gap-4">
            {inbox.past.map((o) => (
              <li key={o.id}>
                <OutingProfileCard
                  outing={o}
                  showRsvp={false}
                  myRsvp={null}
                  loggedInName={null}
                  outingBaseUrl={PUBLIC_BASE}
                  isPast
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 border-t border-surface-400 pt-6">
        <Eyebrow tone="muted" className="mb-2">
          ─ ton appareil seul ─
        </Eyebrow>
        <p className="mb-3 max-w-md text-[15px] leading-[1.5] text-ink-500">
          Tes sorties sont liées à ce navigateur. Connecte-toi pour les retrouver partout, sans
          perdre ton historique.
        </p>
        <div className="flex flex-col items-start gap-2">
          <LoginLink
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600 underline-offset-4 hover:underline"
            label="me connecter →"
          />
          <ResetDeviceTrigger
            reclaimableEmail={reclaim.reclaimableEmail}
            hasReclaimableEmail={reclaim.hasReclaimableEmail}
            isCreatorWithoutEmail={reclaim.isCreatorWithoutEmail}
            anonName={inbox.anonName}
          />
        </div>
      </footer>
    </main>
  );
}
