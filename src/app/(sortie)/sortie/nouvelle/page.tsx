import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { CreateWizard } from "@/features/sortie/components/create-wizard";
import { VIBE_CONFIG, isVibe } from "@/features/sortie/lib/vibe-config";

export const metadata = {
  title: "Nouvelle sortie",
};

type Props = {
  searchParams: Promise<{ vibe?: string; title?: string }>;
};

export default async function NouvelleSortiePage({ searchParams }: Props) {
  const { vibe, title } = await searchParams;
  const vibeKey = isVibe(vibe) ? vibe : null;
  const config = vibeKey ? VIBE_CONFIG[vibeKey] : null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  // `?title=...` (depuis la recherche home no-results) prime sur le
  // titre par défaut du vibe, mais reste tronqué pour matcher la
  // contrainte 200 chars de la colonne `outings.title`.
  const sanitizedTitle = typeof title === "string" ? title.trim().slice(0, 200) : undefined;
  const defaultTitle = sanitizedTitle || config?.title;

  return (
    <CreateWizard
      isLoggedIn={Boolean(user)}
      defaultCreatorName={user?.name ?? undefined}
      vibeKey={vibeKey}
      defaultTitle={defaultTitle}
    />
  );
}
