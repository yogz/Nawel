/**
 * Classes Tailwind partagées entre les cards qui rendent une sortie
 * passée (`OutingProfileCard`, `CompactOutingRow`). Centralise le
 * traitement "souvenir, pas action" : opacité globale, image grayscale,
 * texte estompé d'un cran. Réversible au hover sur l'image (le user
 * peut "rallumer" un souvenir en le survolant).
 */
export function getPastOutingClasses(isPast: boolean) {
  return {
    wrapper: isPast ? "opacity-80 transition-opacity duration-300 hover:opacity-100" : "",
    image: isPast
      ? "grayscale opacity-80 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100"
      : "",
    title: isPast ? "text-ink-500" : "text-ink-700",
    meta: isPast ? "text-ink-400" : "text-ink-500",
  };
}
