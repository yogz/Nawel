"use client";

type Props = {
  className?: string;
  label?: string;
  variant?: "primary" | "inline";
};

// Anchor (not <Link>) because we're crossing sub-domains: sortie → www.
// We tack the current sortie URL onto the login redirect so the magic-link
// email brings the user straight back here. Auth cookies are already scoped
// to `.colist.fr`, so once signed in on www they're signed in on sortie.
//
// Compute the href at click time (not mount time) so the bare `useState +
// useEffect` pattern that looks synchronous-in-effect doesn't trigger the
// cascading-render lint rule. The anchor navigates on click anyway, so the
// handler pre-empts the default and substitutes the right URL.
export function LoginLink({ className, label = "Se connecter", variant = "inline" }: Props) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const callback = encodeURIComponent(window.location.href);
    window.location.href = `https://www.colist.fr/fr/login?callbackURL=${callback}`;
  }

  const base =
    variant === "primary"
      ? "inline-flex h-11 items-center rounded-md bg-bordeaux-600 px-6 text-sm font-medium text-ivoire-100 transition-colors hover:bg-bordeaux-700"
      : "text-sm text-encre-400 underline-offset-4 transition-colors hover:text-bordeaux-700 hover:underline";

  return (
    <a
      href="https://www.colist.fr/fr/login"
      onClick={handleClick}
      className={`${base} ${className ?? ""}`}
    >
      {label}
    </a>
  );
}
