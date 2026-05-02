"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus, X } from "lucide-react";
import { followUserAction, unfollowUserAction } from "@/features/sortie/actions/follow-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  /** Le user que le visiteur s'apprête à suivre / suit déjà. */
  targetUserId: string;
  /** Affichage : déjà follower → bouton "Suivi" qui se transforme en
   * "retirer" au hover. Sinon → "Suivre". */
  isFollowing: boolean;
  /** Token d'invitation actuel du créateur, lu depuis `?k=` côté serveur.
   * Indispensable pour `follow` (gate) ; ignoré pour `unfollow`. Absent
   * (chaîne vide) quand le visiteur arrive sur la vitrine publique sans
   * lien — on n'affiche alors pas le bouton "Suivre". */
  inviteToken: string;
};

/**
 * Bouton follow/unfollow posé dans le header du profil `/@<username>`.
 * Apparaît uniquement quand le visiteur est connecté ET (a) déjà
 * follower OU (b) a un `?k=` token valide pour pouvoir suivre. Côté
 * serveur, `followUserAction` re-vérifie le token contre
 * `user.rsvpInviteToken` — ce composant est juste l'UI du gate.
 */
export function FollowToggle({ targetUserId, isFollowing, inviteToken }: Props) {
  const router = useRouter();
  const [followState, followAction, following] = useActionState<FormActionState, FormData>(
    followUserAction,
    {} as FormActionState
  );
  const [unfollowState, unfollowAction, unfollowing] = useActionState<FormActionState, FormData>(
    unfollowUserAction,
    {} as FormActionState
  );

  // Refresh la page après une mutation réussie : on revalide
  // server-side via revalidatePath, mais le router.refresh garantit
  // que le composant se ré-hydrate avec la nouvelle valeur de
  // `isFollowing` même quand le user reste sur la page.
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

  const err = followState.message ?? unfollowState.message ?? null;

  if (isFollowing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <form action={unfollowAction}>
          <input type="hidden" name="followedUserId" value={targetUserId} />
          <button
            type="submit"
            disabled={unfollowing}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-acid-600/10 px-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-700 ring-1 ring-acid-600/30 transition-colors hover:bg-erreur-50 hover:text-erreur-700 hover:ring-erreur-500/40 disabled:opacity-50"
          >
            <Check size={12} strokeWidth={2.4} className="group-hover:hidden" aria-hidden="true" />
            <X
              size={12}
              strokeWidth={2.4}
              className="hidden group-hover:inline"
              aria-hidden="true"
            />
            <span className="group-hover:hidden">{unfollowing ? "…" : "suivi"}</span>
            <span className="hidden group-hover:inline">retirer</span>
          </button>
        </form>
        {err && (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-erreur-700">{err}</p>
        )}
      </div>
    );
  }

  if (!inviteToken) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={followAction}>
        <input type="hidden" name="followedUserId" value={targetUserId} />
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <button
          type="submit"
          disabled={following}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-700 px-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600 transition-colors hover:bg-ink-700/90 disabled:opacity-50"
        >
          <UserPlus size={12} strokeWidth={2.4} aria-hidden="true" />
          {following ? "…" : "suivre"}
        </button>
      </form>
      {err && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-erreur-700">{err}</p>
      )}
    </div>
  );
}
