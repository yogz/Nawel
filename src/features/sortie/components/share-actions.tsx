"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { buildWhatsAppHref } from "@/features/sortie/lib/whatsapp-share";

type Props = {
  url: string;
  title: string;
  startsAt: Date | null;
  firstName?: string | null;
};

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
        <Copy size={14} />
        {justCopied ? "Copié" : "Copier le lien"}
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
