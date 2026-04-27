"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { buildWhatsAppHref, buildWhatsAppMessage } from "@/features/sortie/lib/whatsapp-share";

// Détection statique de la Web Share API — même pattern que
// `CreateSuccessBanner`. SSR-safe (snapshot serveur = false), pas de
// useEffect → React Compiler heureux.
const NEVER_CHANGES = () => () => {};
const HAS_SHARE = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const HAS_SHARE_SERVER = () => false;

type Props = {
  url: string;
  title: string;
  startsAt: Date | null;
  firstName?: string | null;
};

const SWAP_TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Persistent share row affichée en haut de la page d'une sortie. Mirror
 * visuel du `CreateSuccessBanner` (même bouton WhatsApp en plein
 * or-600, même native share icon-only) pour que le créateur ne se
 * retrouve pas avec deux esthétiques de partage différentes selon qu'il
 * arrive via `?from=create` ou non. La copie du lien reste exposée en
 * fallback texte pour les navigateurs sans Web Share API (Firefox
 * desktop, contextes non-secure).
 */
export function ShareActions({ url, title, startsAt, firstName }: Props) {
  const [justCopied, setJustCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(NEVER_CHANGES, HAS_SHARE, HAS_SHARE_SERVER);
  const whatsAppHref = buildWhatsAppHref({ title, url, startsAt, firstName });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1800);
    } catch {
      // navigator.clipboard requires a secure context — fall back to prompt.
      window.prompt("Copie ce lien :", url);
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title,
        text: buildWhatsAppMessage({ title, url, startsAt, firstName }),
        url,
      });
    } catch {
      // L'utilisateur a annulé la sheet — pas de feedback d'erreur.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsAppHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-or-600 px-4 text-sm font-bold text-ivoire-50 transition-colors duration-300 hover:bg-or-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or-700"
      >
        <MessageCircle size={16} strokeWidth={2.2} />
        Partager sur WhatsApp
      </a>
      {canNativeShare ? (
        <button
          type="button"
          onClick={handleNativeShare}
          aria-label="Partager via une autre application"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-encre-300 bg-ivoire-200 text-encre-700 transition-colors duration-300 hover:border-encre-400 hover:bg-ivoire-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-encre-300"
        >
          <Share2 size={16} />
        </button>
      ) : (
        // Fallback pour Firefox desktop / contextes non-secure : on
        // remplace l'icône native share par un bouton "Copier le lien"
        // textuel. L'animation Framer reprend l'état "Copié" au tap.
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-encre-300 bg-ivoire-200 px-3 text-sm font-medium text-encre-700 transition-colors duration-300 hover:border-encre-400 hover:bg-ivoire-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-encre-300"
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            {justCopied ? (
              <motion.span
                key="done-icon"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                className="inline-flex"
              >
                <Check size={14} />
              </motion.span>
            ) : (
              <motion.span
                key="idle-icon"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={SWAP_TRANSITION}
                className="inline-flex"
              >
                <Copy size={14} />
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={justCopied ? "done-label" : "idle-label"}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={SWAP_TRANSITION}
              className="inline-block"
            >
              {justCopied ? "Copié" : "Copier"}
            </motion.span>
          </AnimatePresence>
        </button>
      )}
    </div>
  );
}
