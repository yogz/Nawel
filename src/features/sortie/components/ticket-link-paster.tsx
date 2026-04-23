"use client";

import { useState } from "react";
import { Link2, Loader2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type Parsed = {
  title: string | null;
  venue: string | null;
  image: string | null;
  ticketUrl: string;
};

type Props = {
  onParsed: (data: Parsed) => void;
  placeholder?: string;
  hint?: string;
};

/**
 * "Coller un lien de billetterie" shortcut. User pastes a Fnac/Allociné/
 * Ticketmaster URL, we fetch it server-side and extract OpenGraph metadata
 * to pre-populate the create form. Skipping date extraction — date formats
 * vary wildly across ticket sites, so the user still picks it by hand.
 */
export function TicketLinkPaster({ onParsed, placeholder, hint }: Props) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!url.trim()) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/sortie/parse-ticket-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "fetch_failed");
      }
      const data = (await res.json()) as Parsed;
      onParsed(data);
      if (!data.title) {
        setError("Aucune info détectée — remplis à la main.");
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "fetch_failed";
      const friendly: Record<string, string> = {
        invalid_url: "URL invalide.",
        unsupported_protocol: "Seuls les liens http(s) sont supportés.",
        blocked_host: "Ce lien n'est pas accepté.",
        not_html: "Ce lien ne pointe pas vers une page web.",
        empty_body: "Réponse vide du site.",
        fetch_failed: "Impossible de lire ce lien, essaie un autre.",
      };
      setError(friendly[code] ?? "Impossible de lire ce lien.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-encre-100 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-bordeaux-600">
        <Wand2 size={14} />
        Raccourci
      </div>
      <p className="mb-3 text-sm text-encre-500">
        {hint ?? "Colle un lien de billetterie, on remplit le reste pour toi."}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-encre-300"
          />
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder ?? "https://www.fnacspectacles.com/place-de-spectacle/..."}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleParse();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleParse}
          disabled={pending || !url.trim()}
          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-bordeaux-600 px-4 text-sm font-semibold text-ivoire-50 transition-colors hover:bg-bordeaux-700 disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Remplir
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-erreur-700">{error}</p>}
    </div>
  );
}
