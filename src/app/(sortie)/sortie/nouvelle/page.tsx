import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { CreateWizard } from "@/features/sortie/components/create-wizard";
import { VIBE_CONFIG, isVibe } from "@/features/sortie/lib/vibe-config";

export const metadata = {
  title: "Nouvelle sortie",
};

type Props = {
  searchParams: Promise<{ vibe?: string }>;
};

export default async function NouvelleSortiePage({ searchParams }: Props) {
  const { vibe } = await searchParams;
  const vibeKey = isVibe(vibe) ? vibe : null;
  const config = vibeKey ? VIBE_CONFIG[vibeKey] : null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;

  return (
    <CreateWizard
      isLoggedIn={Boolean(user)}
      defaultCreatorName={user?.name ?? undefined}
      vibeKey={vibeKey}
      defaultTitle={config?.title}
    />
  );
}
