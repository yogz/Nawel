"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { followUserAction, unfollowUserAction } from "@/features/sortie/actions/follow-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  targetUserId: string;
  /** Token validé côté serveur ; chaîne vide quand le viewer n'a pas
   * pénétré par le lien privé — dans ce cas le bouton « Suivre » n'apparaît
   * pas (mais « Suivi » reste visible si déjà follower). */
  inviteToken: string;
  initialIsFollowing: boolean;
};

/**
 * Toggle suivre/suivi sur le profil public d'un user. Affichage :
 *   - pas follower & token valide → bouton noir/acid « Suivre »
 *   - pas follower & token absent → null (rien à afficher)
 *   - follower → pill acid « Suivi », hover/focus → « Retirer ↩ »
 *
 * Le parent gate `isSelf` et la session — ce composant ne s'affiche
 * que pour un viewer logué non-self.
 */
export function FollowToggle({ targetUserId, inviteToken, initialIsFollowing }: Props) {
  const router = useRouter();
  const [followState, followAction, following] = useActionState<FormActionState, FormData>(
    followUserAction,
    {} as FormActionState
  );
  const [unfollowState, unfollowAction, unfollowing] = useActionState<FormActionState, FormData>(
    unfollowUserAction,
    {} as FormActionState
  );

  // Refresh la page après chaque mutation pour récupérer la nouvelle
  // valeur server-side de `viewerFollows` (et donc l'état initial du
  // toggle au prochain rendu).
  const wasFollowing = useRef(false);
  useEffect(() => {
    const finished = wasFollowing.current && !following;
    wasFollowing.current = following;
    if (finished && !followState.message) {
      router.refresh();
    }
  }, [following, followState, router]);

  const wasUnfollowing = useRef(false);
  useEffect(() => {
    const finished = wasUnfollowing.current && !unfollowing;
    wasUnfollowing.current = unfollowing;
    if (finished && !unfollowState.message) {
      router.refresh();
    }
  }, [unfollowing, unfollowState, router]);

  if (initialIsFollowing) {
    return (
      <form action={unfollowAction} className="shrink-0">
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <button
          type="submit"
          disabled={unfollowing}
          className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-acid-600 px-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-700 transition-colors hover:bg-erreur-500 hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 disabled:opacity-50"
          aria-label="Ne plus suivre"
        >
          <span className="group-hover:hidden">✓ Suivi</span>
          <span className="hidden group-hover:inline">Retirer ↩</span>
        </button>
      </form>
    );
  }

  if (!inviteToken) {
    return null;
  }

  return (
    <form action={followAction} className="shrink-0">
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="inviteToken" value={inviteToken} />
      <button
        type="submit"
        disabled={following}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-700 px-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-acid-600 transition-colors hover:bg-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 disabled:opacity-50"
      >
        {following ? "…" : "+ Suivre"}
      </button>
      {followState.message && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-erreur-700">
          {followState.message}
        </p>
      )}
    </form>
  );
}
