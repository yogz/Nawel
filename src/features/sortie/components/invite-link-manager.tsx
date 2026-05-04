"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MoreHorizontal, RefreshCw, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 * Private-link manager for /moi. Le token gate les RSVP inline sur le
 * profil public. Le user n'a aucune raison de *lire* l'URL — on la cache
 * derrière un fingerprint (4 chars du token) + bouton « Partager »
 * (Web Share API, fallback clipboard) qui est l'action utile.
 *
 * Régénérer + Révoquer passent par AlertDialog stylé (le confirm() natif
 * casse la voix édito de l'app et banalise une action destructive). Le
 * révoquer est cachée derrière un menu Popover « ... » : un user qui
 * révoque sans régénérer est un cas rare (anti-pattern : il perd
 * l'usage du lien sans rien gagner), donc on enterre l'action.
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

  // Refresh la page après un succès server action — sinon le token mis
  // à jour ne remonte pas dans le rendu (server component parent).
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

  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const url = token ? `${origin}/@${username}?k=${token}` : "";
  // Fingerprint = 4 chars du token, lisible en mono ink-400. Sert juste
  // de preuve visuelle qu'un token existe. Le user n'a aucune raison de
  // copier ces 4 chars — c'est de la signalétique.
  const fingerprint = token ? token.slice(0, 4) : "";

  async function handleShare() {
    const canNativeShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (canNativeShare) {
      try {
        await navigator.share({
          title: `Réponds à mes sorties`,
          text: `Mon lien direct pour répondre à toutes mes sorties — sans créer de compte.`,
          url,
        });
        return;
      } catch {
        // User cancelled — pas de fallback automatique pour ne pas faire
        // un "tap pour cancel" qui finit par copier dans le clipboard.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  const err = generateState.message ?? revokeState.message ?? null;

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-500">
          Un seul lien. Tes amis cliquent «&nbsp;j&rsquo;en suis&nbsp;» sur tout, sans créer de
          compte.
        </p>
        <form action={generateAction}>
          <Button type="submit" disabled={generating}>
            {generating ? "Création…" : "Créer le lien"}
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">
        Donne-le à qui doit pouvoir dire oui sans réfléchir. Une fois cliqué, ils voient un bouton
        «&nbsp;j&rsquo;en suis&nbsp;» partout sur ton profil.
      </p>

      {/* Carte « lien actif » : fingerprint + Share/Copy. Pas d'input
          readonly long qui scroll horizontalement sur mobile. */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-acid-600/30 bg-acid-600/5 p-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-acid-700">
            ─ lien actif
          </span>
          <span className="truncate font-mono text-[12px] text-ink-500">
            @{username}?k={fingerprint}…
          </span>
        </div>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Partager le lien"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-acid-600 px-3 py-1.5 text-xs font-semibold text-surface-50 transition-colors hover:bg-acid-700"
        >
          {shareState === "copied" ? (
            <>
              <Check size={12} strokeWidth={3} />
              Copié
            </>
          ) : (
            <>
              <Share2 size={12} strokeWidth={2.4} />
              Partager
            </>
          )}
        </button>
      </div>

      {/* Actions secondaires : copier (au cas où Share natif passe direct
          en partage et on veut juste l'URL en presse-papier), et menu
          « ... » qui contient les actions destructives. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 underline-offset-4 hover:text-acid-700 hover:underline"
        >
          <Copy size={12} />
          Copier l&rsquo;URL
        </button>
        <RegenerateAction
          generateAction={generateAction}
          generating={generating}
          revoking={revoking}
        />
        <RevokeMenu revokeAction={revokeAction} generating={generating} revoking={revoking} />
      </div>

      {err && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {err}
        </p>
      )}
    </div>
  );
}

function RegenerateAction({
  generateAction,
  generating,
  revoking,
}: {
  generateAction: (formData: FormData) => void;
  generating: boolean;
  revoking: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={generating || revoking}
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 underline-offset-4 hover:text-acid-700 hover:underline disabled:opacity-50"
      >
        <RefreshCw size={12} />
        {generating ? "Régénération…" : "Nouveau lien"}
      </button>
      <form ref={formRef} action={generateAction} className="hidden" />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créer un nouveau lien&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              L&rsquo;ancien lien arrête de marcher tout de suite. Tes amis qui l&rsquo;ont déjà
              cliqué restent OK — c&rsquo;est juste qu&rsquo;on ne peut plus le partager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              Oui, nouveau lien
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RevokeMenu({
  revokeAction,
  generating,
  revoking,
}: {
  revokeAction: (formData: FormData) => void;
  generating: boolean;
  revoking: boolean;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Plus d'actions"
            disabled={generating || revoking}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700 disabled:opacity-50"
          >
            <MoreHorizontal size={14} strokeWidth={2.2} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          <button
            type="button"
            onClick={() => {
              setPopOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-erreur-50 hover:text-erreur-700"
          >
            <Trash2 size={14} strokeWidth={2} />
            Casser le lien
          </button>
        </PopoverContent>
      </Popover>
      <form ref={formRef} action={revokeAction} className="hidden" />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Casser le lien&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Le lien arrête de marcher. Tes amis ne pourront plus répondre depuis ton profil tant
              que tu n&rsquo;en crées pas un nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => formRef.current?.requestSubmit()}
              className="bg-erreur-700 hover:bg-erreur-700/90"
            >
              Oui, casser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
