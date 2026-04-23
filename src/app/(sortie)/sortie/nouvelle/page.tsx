import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { CreateOutingForm } from "@/features/sortie/components/create-outing-form";

export const metadata = {
  title: "Créer une sortie",
};

// Mapping from the `?vibe=` query param to a prefilled title. Keeps the
// vibe chips on the home page useful — clicking "Resto" lands you in a
// form that's already half-filled in.
const VIBE_TITLES: Record<string, string> = {
  theatre: "Une pièce de théâtre",
  concert: "Un concert",
  cine: "Au cinéma",
  expo: "Une expo",
};

type Props = {
  searchParams: Promise<{ vibe?: string }>;
};

export default async function NouvelleSortiePage({ searchParams }: Props) {
  const { vibe } = await searchParams;
  const defaultTitle = vibe && VIBE_TITLES[vibe] ? VIBE_TITLES[vibe] : undefined;
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
        defaultTitle={defaultTitle}
      />
    </main>
  );
}
