"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

type Props = {
  url: string;
};

/**
 * One-off banner rendered on the outing page when the creator arrived via
 * `?from=create`. Gives them a copy-link button right at the top so they
 * don't have to hunt for the share affordance further down.
 *
 * Dismissible via the X — stored in `sessionStorage` is overkill for a
 * banner that disappears on the next navigation anyway; we just hide via
 * local state and let the query param linger harmlessly.
 */
export function CreateSuccessBanner({ url }: Props) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!visible) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / insecure contexts: fall back to selecting text.
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-bordeaux-300 bg-bordeaux-50 p-4">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-bordeaux-600 text-ivoire-50"
      >
        <Check size={16} strokeWidth={3} />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-bordeaux-700">Ta sortie est prête.</p>
        <p className="mt-1 text-sm text-encre-500">
          Partage le lien à tes potes pour collecter les réponses.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bordeaux-600 px-4 py-2 text-sm font-semibold text-ivoire-50 transition-colors hover:bg-bordeaux-700"
        >
          {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
          {copied ? "Copié !" : "Copier le lien"}
        </button>
      </div>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => setVisible(false)}
        className="grid size-7 place-items-center rounded-full text-encre-400 transition-colors hover:bg-bordeaux-100 hover:text-bordeaux-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
