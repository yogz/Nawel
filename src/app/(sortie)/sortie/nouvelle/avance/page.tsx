import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { CreateWizard } from "@/features/sortie/components/create-wizard";

export const metadata = {
  title: "Sondage de dates",
};

// Same vibe config as `/nouvelle` — duplicated rather than shared because
// the advanced form uses a different default step flavour and moving this
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

/**
 * Vote-mode variant of the create wizard. Same flow as `/nouvelle`
 * (paste → confirm → slots → venue → name → commit) but the "date"
 * step becomes a multi-slot picker so the creator can propose
 * several dates and let participants vote their availability.
 *
 * Historically this URL hosted a legacy scrollable form
 * (`CreateOutingForm`) which accepted both fixed and vote modes.
 * That form was deleted when this wizard route took over — the
 * fixed path lives at `/nouvelle`, vote lives here.
 */
export default async function NouvelleAvancePage({ searchParams }: Props) {
  const { vibe } = await searchParams;
  const config = vibe && VIBE_CONFIG[vibe] ? VIBE_CONFIG[vibe] : null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  return (
    <CreateWizard
      mode="vote"
      isLoggedIn={Boolean(user)}
      defaultCreatorName={user?.name ?? undefined}
      vibeKey={vibe ?? null}
      pasterPlaceholder={config?.pasterPlaceholder}
      pasterHint={config?.pasterHint}
      defaultTitle={config?.title}
    />
  );
}
