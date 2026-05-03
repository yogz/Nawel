import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { SortieAuthForm } from "@/features/sortie/components/sortie-auth-form";
import type { ParticipantSubPath } from "@/features/sortie/lib/load-participant-page";

const HEADLINE_BY_SUBPATH: Record<ParticipantSubPath, string> = {
  dettes: "Identifie-toi pour voir tes dettes.",
  achat: "Identifie-toi pour gérer l'achat.",
  paiement: "Identifie-toi pour ton paiement.",
  billets: "Identifie-toi pour récupérer tes billets.",
};

type Props = {
  outingTitle: string;
  canonical: string;
  prefillEmail: string | null;
  subPath: ParticipantSubPath;
};

/**
 * Affiché à la place du contenu d'une page privée-participant quand
 * l'utilisateur n'a ni session ni cookie qui matche un participant de
 * la sortie. On lui propose un magic link Better Auth — au verify, le
 * hook `databaseHooks.session.create.after` (auth-config.ts) recolle
 * `participants.userId` via le cookieTokenHash si présent, sinon le
 * match se fera par `userId` au prochain rendu de cette même page.
 *
 * Le `defaultCallbackURL` ramène l'utilisateur exactement sur la page
 * qu'il visait après vérif, plutôt que sur la home Sortie.
 */
export function ParticipantAuthGate({ outingTitle, canonical, prefillEmail, subPath }: Props) {
  const headline = HEADLINE_BY_SUBPATH[subPath];
  const callbackPath = `/${canonical}/${subPath}`;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outingTitle}
        </Link>
      </nav>

      <header className="mb-10 flex flex-col gap-4">
        <Eyebrow tone="hot" glow>
          ─ identification ─
        </Eyebrow>
        <h1 className="font-display text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          {headline}
        </h1>
        <p className="text-[15px] leading-[1.5] text-ink-400">
          Tape ton email — on t&rsquo;envoie un lien magique pour reprendre cette sortie là où tu
          l&rsquo;as laissée.
        </p>
      </header>

      {/* SortieAuthForm utilise useSearchParams → exige un Suspense boundary
          pour le rendu pendant la phase pré-hydration. */}
      <Suspense fallback={null}>
        <SortieAuthForm
          defaultEmail={prefillEmail ?? undefined}
          defaultCallbackURL={callbackPath}
          hideHeader
        />
      </Suspense>
    </main>
  );
}
