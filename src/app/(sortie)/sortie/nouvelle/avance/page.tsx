import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { CreateOutingForm } from "@/features/sortie/components/create-outing-form";

export const metadata = {
  title: "Créer une sortie · avancé",
};

// Same vibe config as `/nouvelle` — duplicated rather than shared because
// the advanced form uses a different component surface and moving this
// into a shared util would be premature for two callers.
type VibeConfig = {
  title: string;
  pasterPlaceholder: string;
  pasterHint: string;
};

const VIBE_CONFIG: Record<string, VibeConfig> = {
  theatre: {
    title: "Théâtre",
    pasterPlaceholder: "https://www.fnacspectacles.com/place-de-spectacle/...",
    pasterHint: "Fnac Spectacles, Théâtres Parisiens Associés, Comédie-Française…",
  },
  opera: {
    title: "Opéra",
    pasterPlaceholder: "https://www.operadeparis.fr/saison-...",
    pasterHint: "Opéra de Paris, Opéra Comique, Théâtre des Champs-Élysées…",
  },
  concert: {
    title: "Concert",
    pasterPlaceholder: "https://www.ticketmaster.fr/fr/manifestation/...",
    pasterHint: "Ticketmaster, Dice, See Tickets, Bandsintown…",
  },
  cine: {
    title: "Ciné",
    pasterPlaceholder: "https://www.allocine.fr/film/fichefilm_gen_cfilm=...",
    pasterHint: "Allociné, UGC Illimité, MK2…",
  },
  expo: {
    title: "Expo",
    pasterPlaceholder: "https://billetterie.parismusees.paris.fr/...",
    pasterHint: "Parismusées, Pompidou, Louvre, expos en ligne…",
  },
};

type Props = {
  searchParams: Promise<{ vibe?: string }>;
};

// Legacy form preserved for power-users who need vote-mode (multi-date
// polls) or granular control over the RSVP deadline. The wizard at
// `/nouvelle` targets the 80% fixed-mode path with a gesture-first UX;
// this page is the escape hatch.
export default async function NouvelleAvancePage({ searchParams }: Props) {
  const { vibe } = await searchParams;
  const config = vibe && VIBE_CONFIG[vibe] ? VIBE_CONFIG[vibe] : null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl px-6 py-14">
      <nav className="mb-10">
        <Link href="/" className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700">
          ← Sortie
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          Formulaire avancé
        </p>
        <h1 className="text-4xl leading-tight text-encre-700">
          Sondage de dates ou contrôle fin ?
        </h1>
        <p className="mt-3 max-w-md text-encre-500">
          Tu peux revenir au{" "}
          <Link href="/nouvelle" className="underline">
            mode rapide
          </Link>{" "}
          si tu n&rsquo;as pas besoin de ces options.
        </p>
      </header>

      <CreateOutingForm
        isLoggedIn={Boolean(user)}
        defaultCreatorName={user?.name ?? undefined}
        defaultTitle={config?.title}
        pasterPlaceholder={config?.pasterPlaceholder}
        pasterHint={config?.pasterHint}
      />
    </main>
  );
}
