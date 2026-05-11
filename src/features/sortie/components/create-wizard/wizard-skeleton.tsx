/**
 * Skeleton serveur affiché pendant le téléchargement du JS du wizard.
 * Match grossièrement la layout du premier step (paste) pour éviter un
 * layout shift au mount du composant client réel.
 */
export function WizardSkeleton() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-surface-100">
      <div className="flex items-center justify-between px-6 pt-5">
        <div className="h-9 w-9 animate-pulse rounded-full bg-surface-300" />
        <div className="h-1 w-32 animate-pulse rounded-full bg-surface-300" />
        <div className="h-9 w-9" />
      </div>
      <div className="flex-1 px-6 pt-10">
        <div className="mb-3 h-3 w-32 animate-pulse rounded bg-surface-300" />
        <div className="mb-2 h-12 w-3/4 animate-pulse rounded bg-surface-300" />
        <div className="mb-8 h-12 w-2/3 animate-pulse rounded bg-surface-300" />
        <div className="h-14 animate-pulse rounded-2xl bg-surface-300" />
      </div>
    </div>
  );
}
