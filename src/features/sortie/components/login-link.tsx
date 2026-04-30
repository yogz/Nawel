"use client";

type Props = {
  className?: string;
  label?: string;
  variant?: "primary" | "inline";
  /** Hook optionnel appelé avant la redirection — utile pour tracker
   * un clic via Umami sans bypass le redirect natif (le handler pose
   * `window.location.href` derrière, donc l'event a quand même le
   * temps d'être émis). */
  onClick?: () => void;
};

// Pointe désormais vers `/sortie/login` (page interne avec charte Sortie)
// plutôt que vers le login Colist en cross-domain. On préserve le
// `callbackURL` côté query pour que Better Auth renvoie l'utilisateur
// pile où il était. Le path interne traverse le proxy host : sur
// `sortie.colist.fr`, `/login` est rewritten en `/sortie/login`.
//
// Compute le href au click — sans ça le SSR pre-renderer pose un href
// arbitraire qui fuirait le `window.location` de la page cliente. Le
// handler pre-empte le default anchor et substitue la bonne URL.
export function LoginLink({
  className,
  label = "Se connecter",
  variant = "inline",
  onClick,
}: Props) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    onClick?.();
    const callback = encodeURIComponent(window.location.href);
    window.location.href = `/login?callbackURL=${callback}`;
  }

  const base =
    variant === "primary"
      ? "inline-flex h-11 items-center rounded-md bg-acid-600 px-6 text-sm font-medium text-surface-100 transition-colors hover:bg-acid-700"
      : "text-sm text-ink-400 underline-offset-4 transition-colors hover:text-acid-700 hover:underline";

  return (
    <a href="/login" onClick={handleClick} className={`${base} ${className ?? ""}`}>
      {label}
    </a>
  );
}
