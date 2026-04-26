"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { buildWhatsAppHref } from "@/features/sortie/lib/whatsapp-share";

type Props = {
  url: string;
  title: string;
  startsAt: Date | null;
  firstName?: string | null;
};

const SWAP_TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

export function ShareActions({ url, title, startsAt, firstName }: Props) {
  const [justCopied, setJustCopied] = useState(false);

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

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-ivoire-400 px-3 py-1.5 text-sm text-encre-500 transition-colors hover:border-or-500 hover:text-bordeaux-700"
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
            {justCopied ? "Copié" : "Copier le lien"}
          </motion.span>
        </AnimatePresence>
      </button>
      <a
        href={whatsAppHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-or-500 bg-or-50 px-3 py-1.5 text-sm text-or-800 transition-colors hover:bg-or-100"
      >
        <MessageCircle size={14} />
        WhatsApp
      </a>
    </div>
  );
}
