"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeFollowerAction } from "@/features/sortie/actions/follow-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { FollowerRow } from "@/features/sortie/queries/follow-queries";
import { UserAvatar } from "./user-avatar";

type Props = {
  followers: FollowerRow[];
};

export function FollowerList({ followers }: Props) {
  if (followers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-surface-400 bg-surface-100/50 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        ↳ personne ne te suit pour l&rsquo;instant
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {followers.map((f) => (
        <li key={f.followerUserId}>
          <FollowerRowItem follower={f} />
        </li>
      ))}
    </ul>
  );
}

function FollowerRowItem({ follower }: { follower: FollowerRow }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormActionState, FormData>(
    removeFollowerAction,
    {} as FormActionState
  );
  // Two-tap pattern : 1er tap arme la mise en garde rouge inline, 2ème tap
  // déclenche le `window.confirm` natif puis le submit. Évite les retraits
  // accidentels (le bouton est petit et la liste peut scroller).
  const [armed, setArmed] = useState(false);

  const wasPending = useRef(false);
  useEffect(() => {
    const finished = wasPending.current && !pending;
    wasPending.current = pending;
    if (finished && !state.message) {
      router.refresh();
    }
  }, [pending, state, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!armed) {
      e.preventDefault();
      setArmed(true);
      return;
    }
    if (!window.confirm(`Retirer ${follower.name} de tes suiveurs ?`)) {
      e.preventDefault();
      setArmed(false);
    }
  }

  const profileHref = follower.username ? `/@${follower.username}` : null;

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        <UserAvatar name={follower.name} image={follower.image} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link
            href={profileHref}
            className="block truncate font-display text-[15px] font-bold tracking-[-0.015em] text-ink-700 hover:text-acid-600"
          >
            {follower.name}
          </Link>
        ) : (
          <span className="block truncate font-display text-[15px] font-bold tracking-[-0.015em] text-ink-700">
            {follower.name}
          </span>
        )}
        {follower.username && (
          <span className="block truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            @{follower.username}
          </span>
        )}
      </div>
      <form action={action} onSubmit={handleSubmit} className="shrink-0">
        <input type="hidden" name="followerUserId" value={follower.followerUserId} />
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50 ${
            armed
              ? "bg-erreur-500 text-surface-50 hover:bg-erreur-700"
              : "text-ink-500 underline-offset-4 hover:text-erreur-700 hover:underline"
          }`}
          aria-label={armed ? "Confirmer le retrait" : "Retirer ce suiveur"}
        >
          {pending ? "…" : armed ? "Confirmer" : "Retirer"}
        </button>
      </form>
    </div>
  );
}
