import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { SortieAuthForm } from "@/features/sortie/components/sortie-auth-form";

export const metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ callbackURL?: string; token?: string }>;
};

export default async function SortieLoginPage({ searchParams }: Props) {
  const { callbackURL, token } = await searchParams;

  // Si l'utilisateur est déjà loggé ET qu'on n'est pas sur le path
  // magic-link verify (?token=...), on le renvoie direct vers la
  // home Sortie ou son callbackURL — pas la peine de lui montrer le
  // form. Quand il y a un `token`, on laisse le form gérer le verify
  // (il est possible que le verify rafraîchisse la session).
  if (!token) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      redirect(callbackURL || "/");
    }
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),2rem)] pb-12">
      {/* Petite nav back vers la home Sortie — utile pour les invités
          qui ont cliqué LoginLink par erreur depuis une page profil
          ou /moi. */}
      <nav className="mb-12">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          accueil
        </Link>
      </nav>

      {/* Glow d'ambiance acid + hot pink, identique à la home publique
          pour la continuité de marque. Pas de motif "v0.1" à fond
          parce que la page est dense en form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 95% 0%, rgba(199,255,60,0.16) 0%, transparent 45%), radial-gradient(circle at 5% 95%, rgba(255,61,129,0.12) 0%, transparent 50%)",
        }}
      />

      <Suspense fallback={<AuthFormSkeleton />}>
        <SortieAuthForm />
      </Suspense>
    </main>
  );
}

function AuthFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-3 w-24 animate-pulse rounded-full bg-ivoire-200" />
      <div className="h-12 w-48 animate-pulse rounded-full bg-ivoire-200" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-ivoire-100" />
      <div className="h-12 w-full animate-pulse rounded-full bg-ivoire-200" />
    </div>
  );
}
