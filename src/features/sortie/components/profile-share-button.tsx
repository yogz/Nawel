"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

type Props = {
  /** Absolute URL to share — computed server-side so it stays accurate
   * across dev (sortie.localhost) and prod (sortie.colist.fr). */
  url: string;
  /** Display name used as the share sheet title on iOS / Android. */
  name: string;
};

/**
 * Icon-only share trigger for the public profile nav. On mobile it
 * opens the native share sheet (`navigator.share`); on desktop or
 * when the API is unavailable, it falls back to clipboard copy with
 * a "Lien copié" confirmation pill that dissolves after ~2s.
 *
 * Kept separate from the event-level `ShareActions` component because
 * the constraints differ: the profile needs an icon-sized affordance
 * in the top nav, not a WhatsApp + copy row under the event page.
 */
export function ProfileShareButton({ url, name }: Props) {
  const [justCopied, setJustCopied] = useState(false);

  async function handleShare() {
    // iOS Safari + most mobile browsers have the Web Share API; desktop
    // Chromium has it behind `share` too when allowed by permission. We
    // always try it first — cleaner UX when supported.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${name} · Sortie`,
          text: `Les sorties de ${name} sur Sortie.`,
          url,
        });
        return;
      } catch {
        // User cancelled or permission denied — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 2000);
    } catch {
      // Clipboard requires a secure context too — last resort: prompt.
      window.prompt("Copie ce lien :", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={justCopied ? "Lien copié" : "Partager ce profil"}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-700"
    >
      {justCopied ? (
        <>
          <Check size={14} strokeWidth={2.2} />
          Copié
        </>
      ) : (
        <>
          <Share2 size={14} strokeWidth={2} />
          Partager
        </>
      )}
    </button>
  );
}
