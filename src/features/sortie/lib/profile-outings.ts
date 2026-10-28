/**
 * Règles pures du profil `/@<username>`. Cf.
 * docs/superpowers/specs/2026-10-28-sortie-profile-attending-design.md.
 *
 * Le profil liste les sorties créées par l'utilisateur ET celles d'autrui
 * où il va. La vitrine publique n'en montre que l'image, le titre et la
 * salle ; le lien privé garde tout pour ses sorties, et montre celles
 * d'autrui sans moyen de s'y inscrire.
 */

/** Réponses qui veulent dire « j'y vais ». */
export const ATTENDING_RESPONSES = ["yes", "handle_own"] as const;

export type ProfileOutingRow = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  status: string;
  mode: "fixed" | "vote";
  heroImageUrl: string | null;
  createdAt: Date;
  confirmedCount: number;
  creatorUserId: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
};

export type ProfileOuting = ProfileOutingRow & { isOwn: boolean };

/**
 * Ce que la vitrine publique a le droit d'envoyer au navigateur : ni date,
 * ni lien, ni compteur.
 */
export type ShowcaseOuting = {
  id: string;
  title: string;
  location: string | null;
  heroImageUrl: string | null;
};

/**
 * Découpe à venir / passées sur `startsAt` (un sondage non tranché, sans
 * date, compte comme à venir). L'ordre d'entrée est conservé.
 */
export function splitProfileOutings(
  rows: ProfileOutingRow[],
  userId: string,
  now: Date
): { upcoming: ProfileOuting[]; past: ProfileOuting[] } {
  const all = rows.map((r) => ({ ...r, isOwn: r.creatorUserId === userId }));
  return {
    upcoming: all.filter((o) => !o.startsAt || o.startsAt >= now),
    past: all.filter((o) => o.startsAt && o.startsAt < now),
  };
}

export function toShowcaseOuting(o: ProfileOuting): ShowcaseOuting {
  return { id: o.id, title: o.title, location: o.location, heroImageUrl: o.heroImageUrl };
}

export function organizerLabel(o: ProfileOuting): string | null {
  if (o.isOwn) {
    return null;
  }
  if (o.creatorUsername) {
    return `organisé par @${o.creatorUsername}`;
  }
  if (o.creatorName) {
    return `organisé par ${o.creatorName}`;
  }
  return null;
}

/**
 * Description de l'aperçu de partage (WhatsApp/iMessage) : 3 prochains
 * titres, sans date — la vitrine publique n'en montre pas. Vise ~140 chars
 * pour rester sous la troncature des messageries.
 */
export function buildProfileDescription(args: {
  upcomingTitles: string[];
  pastCount: number;
}): string {
  if (args.upcomingTitles.length === 0) {
    if (args.pastCount > 0) {
      const label = args.pastCount === 1 ? "sortie passée" : "sorties passées";
      return `${args.pastCount} ${label} · la prochaine arrive bientôt.`;
    }
    return "Les prochaines sorties arriveront ici.";
  }

  const parts = args.upcomingTitles.slice(0, 3).map((t) => truncateTitle(t, 32));
  const overflow = args.upcomingTitles.length - parts.length;
  if (overflow > 0) {
    parts.push(`+${overflow} autre${overflow > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

function truncateTitle(title: string, max: number): string {
  if (title.length <= max) {
    return title;
  }
  return `${title.slice(0, max - 1).trimEnd()}…`;
}
