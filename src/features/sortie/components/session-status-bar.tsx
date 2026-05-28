import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { LoginLink } from "@/features/sortie/components/login-link";

// Bandeau de statut de session — repère permanent affiché tant que le
// visiteur n'a pas de session. Dans Sortie l'identité est par défaut liée à
// l'APPAREIL (cookie `sortie_pt`), donc plein d'actions tournent en mode
// dégradé sans dire « tu n'es pas connecté » (vote cross-device, billets
// masqués…). Ce bandeau adresse la découvrabilité de cet état.
//
// Server Component : lit la session côté serveur (le bandeau disparaît dès
// qu'on est connecté) et le path courant via `x-pathname` (posé par
// `src/proxy.ts`, déjà consommé par le gate admin) pour s'exclure des routes
// où il serait absurde.
export async function SessionStatusBar() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  // Connecté → aucun repère à montrer.
  if (session?.user) {
    return null;
  }

  const pathname = h.get("x-pathname") ?? "";
  // `/login` : redondant au-dessus du formulaire de connexion.
  // `/admin/*` : réservé connecté/2FA, on n'y arrive pas déconnecté.
  if (pathname === "/login" || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-40 flex h-11 items-center justify-between border-b border-white/8 bg-surface-100/95 px-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-motion-standard motion-safe:ease-motion-standard"
      role="status"
    >
      <span className="flex items-center gap-2 text-[13px] text-ink-300">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-acid-600 motion-safe:animate-pulse"
        />
        Pas connecté
      </span>
      <LoginLink variant="outline" label="S'identifier" className="h-8" />
    </div>
  );
}
