import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { CreateOutingForm } from "@/features/sortie/components/create-outing-form";

export const metadata = {
  title: "Créer une sortie",
};

// Each vibe steers three things at once: a title seed, a placeholder URL
// hinting at the right ticket site, and the helper copy above the paster.
// Clicking the home-page chip becomes a real head start instead of just a
// pre-filled string.
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

export default async function NouvelleSortiePage({ searchParams }: Props) {
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
          Nouvelle sortie
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">
          À qui tu proposes ça&nbsp;?
        </h1>
        <p className="mt-3 max-w-md text-encre-500">
          Remplis l&rsquo;essentiel, tu pourras modifier tant que la deadline n&rsquo;est pas
          passée.
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
