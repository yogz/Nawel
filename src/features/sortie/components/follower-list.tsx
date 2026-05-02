"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { removeFollowerAction } from "@/features/sortie/actions/follow-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Follower = {
  followerUserId: string;
  createdAt: Date;
  name: string;
  username: string | null;
  image: string | null;
};

type Props = {
  followers: Follower[];
};

/**
 * Liste des suiveurs sur /moi. Pour chaque row, avatar + nom + handle
 * (link au profil public) + bouton "retirer". Le retrait est un soft
 * control a posteriori : utile si le créateur voit arriver un nom
 * inconnu (le `rsvpInviteToken` a fuité par exemple).
 *
 * Confirm `window.confirm` au retrait — un retrait par erreur force
 * le suiveur à redemander un nouveau lien privé pour revenir, donc
 * on rend l'action volontaire.
 */
export function FollowerList({ followers }: Props) {
  if (followers.length === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        ↳ personne ne te suit pour l&rsquo;instant
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {followers.map((f) => (
        <li key={f.followerUserId}>
          <FollowerRow follower={f} />
        </li>
      ))}
    </ul>
  );
}

function FollowerRow({ follower }: { follower: Follower }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormActionState, FormData>(
    removeFollowerAction,
    {} as FormActionState
  );
  const wasPending = useRef(false);
  useEffect(() => {
    const finished = wasPending.current && !pending;
    wasPending.current = pending;
    if (finished && !state.message) {
      router.refresh();
    }
  }, [pending, state, router]);

  const [confirming, setConfirming] = useState(false);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirming) {
      e.preventDefault();
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (
      !window.confirm(
        `Retirer ${follower.name} ? Pour revenir, il devra repasser par ton lien privé.`
      )
    ) {
      e.preventDefault();
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-400 bg-surface-100 p-3">
      <UserAvatar name={follower.name} image={follower.image} size={36} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-bold tracking-[-0.015em] text-ink-700">
          {follower.name}
        </p>
        {follower.username && (
          <Link
            href={`/@${follower.username}`}
            className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400 underline-offset-4 hover:text-acid-600 hover:underline"
          >
            @{follower.username}
          </Link>
        )}
      </div>
      <form action={action} onSubmit={onSubmit}>
        <input type="hidden" name="followerUserId" value={follower.followerUserId} />
        <button
          type="submit"
          disabled={pending}
          aria-label={`Retirer ${follower.name} de mes suiveurs`}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-mono text-[10.5px] uppercase tracking-[0.22em] transition-colors disabled:opacity-50 ${
            confirming
              ? "bg-erreur-500 text-surface-50 hover:bg-erreur-600"
              : "text-ink-400 hover:bg-erreur-50 hover:text-erreur-700"
          }`}
        >
          <X size={12} strokeWidth={2.4} aria-hidden="true" />
          {pending ? "…" : confirming ? "confirmer" : "retirer"}
        </button>
      </form>
      {state.message && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-erreur-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
