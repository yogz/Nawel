import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { CreateWizard } from "@/features/sortie/components/create-wizard";

export const metadata = {
  title: "Nouvelle sortie",
};

// Each vibe chip on the home page seeds the paster placeholder + hint so
// the create flow feels context-aware: "tu viens pour un opéra → on
// attend un lien de l'Opéra de Paris".
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

export default async function NouvelleSortiePage({ searchParams }: Props) {
  const { vibe } = await searchParams;
  const config = vibe && VIBE_CONFIG[vibe] ? VIBE_CONFIG[vibe] : null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  return (
    <CreateWizard
      isLoggedIn={Boolean(user)}
      defaultCreatorName={user?.name ?? undefined}
      vibeKey={vibe ?? null}
      pasterPlaceholder={config?.pasterPlaceholder}
      pasterHint={config?.pasterHint}
      defaultTitle={config?.title}
    />
  );
}
