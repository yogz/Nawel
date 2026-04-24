"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateInviteLinkAction,
  revokeInviteLinkAction,
} from "@/features/sortie/actions/invite-link-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  username: string;
  token: string | null;
  /** Full origin (e.g. `https://sortie.colist.fr`) passed from the server
   * component so we build a correct URL without touching `window` client-side
   * (which otherwise requires a cascading `useState + useEffect` dance). */
  origin: string;
};

/**
 * Private-link manager for /moi. The token gates inline RSVP on the public
 * profile — see `profile/[username]/page.tsx`. The URL is built client-side
 * from `window.location.origin` so dev (localhost subdomain) and prod both
 * work without env plumbing.
 *
 * Regenerate and revoke are the same "mutate the token" server action shape;
 * both prompt a browser `confirm` because losing the old link is a real cost
 * — anyone holding it drops back to vitrine mode.
 */
export function InviteLinkManager({ username, token, origin }: Props) {
  const router = useRouter();
  const [generateState, generateAction, generating] = useActionState<FormActionState, FormData>(
    generateInviteLinkAction,
    {} as FormActionState
  );
  const [revokeState, revokeAction, revoking] = useActionState<FormActionState, FormData>(
    revokeInviteLinkAction,
    {} as FormActionState
  );

  const wasGenerating = useRef(false);
  useEffect(() => {
    const finished = wasGenerating.current && !generating;
    wasGenerating.current = generating;
    if (finished && !generateState.errors && !generateState.message) {
      router.refresh();
    }
  }, [generating, generateState, router]);

  const wasRevoking = useRef(false);
  useEffect(() => {
    const finished = wasRevoking.current && !revoking;
    wasRevoking.current = revoking;
    if (finished && !revokeState.errors && !revokeState.message) {
      router.refresh();
    }
  }, [revoking, revokeState, router]);

  const [copied, setCopied] = useState(false);
  const url = token ? `${origin}/@${username}?k=${token}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  function handleRegenerate(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Les anciens liens ne marcheront plus. Continuer ?")) {
      e.preventDefault();
    }
  }

  function handleRevoke(e: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Le lien va être supprimé. Tes amis ne pourront plus RSVP depuis ton profil. Continuer ?"
      )
    ) {
      e.preventDefault();
    }
  }

  const err = generateState.message ?? revokeState.message ?? null;

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-encre-500">
          Un lien privé pour tes amis&nbsp;: ils répondent à toutes tes sorties depuis ton profil,
          d&rsquo;un coup.
        </p>
        <form action={generateAction}>
          <Button type="submit" disabled={generating}>
            {generating ? "Création…" : "Générer un lien"}
          </Button>
        </form>
        {err && (
          <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
            {err}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-encre-500">
        Partage ce lien à ton cercle. Avec le lien, ils verront un bouton « J&rsquo;en suis » sur
        chaque sortie à venir, sans quitter ton profil.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-ivoire-400 bg-ivoire-50 p-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-encre-600 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bordeaux-600 px-3 py-1.5 text-xs font-semibold text-ivoire-50 transition-colors hover:bg-bordeaux-700"
        >
          {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <form action={generateAction} onSubmit={handleRegenerate}>
          <button
            type="submit"
            disabled={generating || revoking}
            className="inline-flex items-center gap-1.5 text-xs text-encre-500 underline-offset-4 hover:text-bordeaux-700 hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} />
            {generating ? "Régénération…" : "Régénérer"}
          </button>
        </form>
        <form action={revokeAction} onSubmit={handleRevoke}>
          <button
            type="submit"
            disabled={generating || revoking}
            className="inline-flex items-center gap-1.5 text-xs text-encre-500 underline-offset-4 hover:text-erreur-700 hover:underline disabled:opacity-50"
          >
            <Trash2 size={12} />
            {revoking ? "Suppression…" : "Révoquer"}
          </button>
        </form>
      </div>
      {err && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {err}
        </p>
      )}
    </div>
  );
}
