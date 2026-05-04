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
  /** Full origin (e.g. `https://sortie.colist.fr`) passé depuis le server
   * component pour construire l'URL sans toucher `window` côté client. */
  origin: string;
};

type ActionDispatcher = (formData: FormData) => void;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copie ce lien :", text);
    return false;
  }
}

/**
 * Private-link manager pour `/moi`. Le token gate les RSVP inline sur le
 * profil public. Le user n'a aucune raison de *lire* l'URL — on la cache
 * derrière un fingerprint (4 chars du token) + bouton « Partager »
 * (Web Share API, fallback clipboard).
 *
 * Régénérer + Révoquer passent par AlertDialog stylé (le `confirm()` natif
 * casse la voix édito de l'app et banalise une action destructive). Le
 * révoquer est cachée derrière un menu Popover « ⋯ » : un user qui
 * révoque sans régénérer perd l'usage du lien sans rien gagner, donc on
 * enterre l'action.
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

  useRefreshOnSuccess(generating, generateState, router.refresh);
  useRefreshOnSuccess(revoking, revokeState, router.refresh);

  const [copied, setCopied] = useState(false);
  const url = token ? `${origin}/@${username}?k=${token}` : "";
  const fingerprint = token ? token.slice(0, 4) : "";

  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Réponds à mes sorties",
          text: "Mon lien direct pour répondre à toutes mes sorties — sans créer de compte.",
          url,
        });
        return;
      } catch {
        // User cancelled — pas de fallback automatique pour ne pas faire
        // un "tap pour cancel" qui finit par copier dans le clipboard.
        return;
      }
    }
    if (await copyToClipboard(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
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
        {err && <ErrorBanner message={err} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">
        Donne-le à qui doit pouvoir dire oui sans réfléchir. Une fois cliqué, ils voient un bouton
        «&nbsp;j&rsquo;en suis&nbsp;» partout sur ton profil.
      </p>

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
          {copied ? (
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 underline-offset-4 hover:text-acid-700 hover:underline"
        >
          <Copy size={12} />
          Copier l&rsquo;URL
        </button>

        <ConfirmAction
          dispatcher={generateAction}
          disabled={generating || revoking}
          title="Créer un nouveau lien&nbsp;?"
          description="L'ancien lien arrête de marcher tout de suite. Tes amis qui l'ont déjà cliqué restent OK — c'est juste qu'on ne peut plus le partager."
          confirmLabel="Oui, nouveau lien"
        >
          {(open) => (
            <button
              type="button"
              onClick={open}
              disabled={generating || revoking}
              className="inline-flex items-center gap-1.5 text-xs text-ink-500 underline-offset-4 hover:text-acid-700 hover:underline disabled:opacity-50"
            >
              <RefreshCw size={12} />
              {generating ? "Régénération…" : "Nouveau lien"}
            </button>
          )}
        </ConfirmAction>

        <RevokeMenu dispatcher={revokeAction} disabled={generating || revoking} />
      </div>

      {err && <ErrorBanner message={err} />}
    </div>
  );
}

/**
 * Trigger destructive caché derrière un Popover « ⋯ » → AlertDialog.
 * Render-prop pattern : `ConfirmAction` ouvre le dialog, le caller décide
 * de l'élément qui le déclenche (lien inline, item de popover, etc.).
 */
function RevokeMenu({ dispatcher, disabled }: { dispatcher: ActionDispatcher; disabled: boolean }) {
  const [popOpen, setPopOpen] = useState(false);

  return (
    <ConfirmAction
      dispatcher={dispatcher}
      disabled={disabled}
      title="Casser le lien&nbsp;?"
      description="Le lien arrête de marcher. Tes amis ne pourront plus répondre depuis ton profil tant que tu n'en crées pas un nouveau."
      confirmLabel="Oui, casser"
      destructive
    >
      {(open) => (
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Plus d'actions"
              disabled={disabled}
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
                open();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-erreur-50 hover:text-erreur-700"
            >
              <Trash2 size={14} strokeWidth={2} />
              Casser le lien
            </button>
          </PopoverContent>
        </Popover>
      )}
    </ConfirmAction>
  );
}

function ConfirmAction({
  dispatcher,
  disabled,
  title,
  description,
  confirmLabel,
  destructive = false,
  children,
}: {
  dispatcher: ActionDispatcher;
  disabled: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  children: (open: () => void) => React.ReactNode;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const open = () => setConfirmOpen(true);

  return (
    <>
      {children(open)}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle dangerouslySetInnerHTML={{ __html: title }} />
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dispatcher(new FormData())}
              className={destructive ? "bg-erreur-700 hover:bg-erreur-700/90" : undefined}
              disabled={disabled}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
      {message}
    </p>
  );
}

/**
 * Refresh la page après un succès server action — sinon le token mis à
 * jour ne remonte pas dans le rendu (server component parent).
 */
function useRefreshOnSuccess(pending: boolean, state: FormActionState, refresh: () => void) {
  const wasPending = useRef(false);
  useEffect(() => {
    const finished = wasPending.current && !pending;
    wasPending.current = pending;
    if (finished && !state.errors && !state.message) {
      refresh();
    }
  }, [pending, state, refresh]);
}
