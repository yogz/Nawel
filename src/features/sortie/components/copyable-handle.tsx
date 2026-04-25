"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  username: string;
  origin: string;
};

/**
 * Copyable `@handle` pill shown on /moi under the user's name — makes
 * the shareable identity immediately present + gives a one-tap copy
 * (pattern familiar from Instagram / Threads / Linktree).
 *
 * Stores `@username` on click, swaps the icon to a check for ~1.5s to
 * acknowledge, then returns to the clipboard icon. Falls back to a
 * native prompt if `navigator.clipboard` isn't available (older iOS /
 * http contexts).
 */
export function CopyableHandle({ username, origin }: Props) {
  const [copied, setCopied] = useState(false);
  const handle = `@${username}`;
  const fullUrl = `${origin}/@${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copie ce lien :", fullUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Lien copié" : `Copier ${fullUrl}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-bordeaux-50 px-3 py-1.5 text-sm font-semibold text-bordeaux-700 transition-colors hover:bg-bordeaux-100 motion-safe:active:scale-95"
    >
      {copied ? (
        <>
          <Check size={14} strokeWidth={2.5} />
          <span>Copié</span>
        </>
      ) : (
        <>
          <span>{handle}</span>
          <Copy size={12} strokeWidth={2} className="opacity-70" />
        </>
      )}
    </button>
  );
}
