export type Vibe = "theatre" | "opera" | "concert" | "cine" | "expo" | "autre";

export type VibeOption = { value: Vibe; label: string };

export const VIBE_OPTIONS: VibeOption[] = [
  { value: "theatre", label: "Théâtre" },
  { value: "opera", label: "Opéra" },
  { value: "concert", label: "Concert" },
  { value: "cine", label: "Ciné" },
  { value: "expo", label: "Expo" },
  { value: "autre", label: "Autre" },
];

export type VibeConfig = {
  title: string;
  pasterPlaceholder: string;
  pasterHint: string;
};

// Per-vibe seeding for the create wizard's paste step: placeholder
// previews a realistic URL for the category, hint lists the platforms
// the parser actually handles well. "autre" has no config — the generic
// fallback copy in `PasteStep` covers it.
export const VIBE_CONFIG: Partial<Record<Vibe, VibeConfig>> = {
  theatre: {
    title: "Théâtre",
    pasterPlaceholder: "https://www.theatrechampselysees.fr/spectacle/...",
    pasterHint: "Ticketmaster, sites des théâtres (Comédie-Française, Champs-Élysées…)",
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

export function isVibe(v: string | null | undefined): v is Vibe {
  return (
    v === "theatre" ||
    v === "opera" ||
    v === "concert" ||
    v === "cine" ||
    v === "expo" ||
    v === "autre"
  );
}
