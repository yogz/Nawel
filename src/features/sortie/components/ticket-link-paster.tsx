"use client";

import { useState } from "react";
import { ArrowRight, Link2, Loader2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type SpaHint = { siteName: string; alternate: string | null } | null;

type Parsed = {
  title: string | null;
  venue: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
  spaHint?: SpaHint;
};

type Props = {
  onParsed: (data: Parsed) => void;
  placeholder?: string;
  hint?: string;
};

/**
 * "Coller un lien de billetterie" shortcut. User pastes a URL, we fetch
 * it server-side and extract OpenGraph / JSON-LD metadata to pre-fill
 * the create form.
 *
 * When the server finds nothing useful (pathé.fr, ugc.fr and other
 * client-rendered shells), we stop auto-advancing and show the user a
 * tailored message + explicit "continuer à la main" action. The URL
 * itself is still carried forward so the ticketUrl field is saved.
 */
/**
 * Extract the first http(s) URL from an arbitrary blob. Handles:
 *   - raw URL already clean
 *   - URL embedded in a WhatsApp-style message
 *   - trailing punctuation (`!`, `.`, `,`, `;`, `)`, `]`, `}`) — often
 *     leaked from the surrounding sentence
 *   - adjacent double-quotes / backticks / angle brackets
 * Returns null when nothing remotely URL-shaped is in the blob.
 */
function extractFirstUrl(raw: string): string | null {
  const match = raw.match(/https?:\/\/[^\s<>()[\]{}"'`]+/i);
  if (!match) {
    return null;
  }
  let url = match[0];
  while (url.length > 0 && /[.,;!?:)\]}>"'`]$/.test(url)) {
    url = url.slice(0, -1);
  }
  return url || null;
}

export function TicketLinkPaster({ onParsed, placeholder, hint }: Props) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Staged result: when the server returns *some* data but nothing
  // useful, we keep it here and prompt the user rather than silently
  // dropping them onto an empty confirm card.
  const [noDataStaged, setNoDataStaged] = useState<Parsed | null>(null);

  function isUsefulData(data: Parsed): boolean {
    return Boolean(data.title || data.venue || data.image || data.startsAt);
  }

  async function handleParse() {
    const raw = url.trim();
    if (!raw) {
      return;
    }
    // Pull the first http(s) URL out of the blob in case the user pasted
    // a whole WhatsApp message ("check ça les potes: https://… — c'est ce
    // soir"). We also echo the clean URL back into the field so the user
    // sees what we're fetching.
    const cleaned = extractFirstUrl(raw);
    if (!cleaned) {
      setError("Aucun lien http(s) détecté dans ce que tu as collé.");
      return;
    }
    if (cleaned !== raw) {
      setUrl(cleaned);
    }
    setError(null);
    setNoDataStaged(null);
    setPending(true);
    try {
      const res = await fetch("/api/sortie/parse-ticket-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "fetch_failed");
      }
      const data = (await res.json()) as Parsed;
      if (isUsefulData(data)) {
        onParsed(data);
      } else {
        // Stage the URL so the user can continue with it, but don't
        // advance automatically — an empty confirm card feels broken.
        setNoDataStaged(data);
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

  const spaHint = noDataStaged?.spaHint ?? null;

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
            onChange={(e) => {
              setUrl(e.target.value);
              setNoDataStaged(null);
              setError(null);
            }}
            placeholder={placeholder ?? "https://www.ticketmaster.fr/fr/manifestation/..."}
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

      {noDataStaged && (
        <div className="mt-3 rounded-lg border border-encre-100 bg-ivoire-50 p-3">
          <p className="text-sm text-encre-600">
            {spaHint?.siteName
              ? `${spaHint.siteName} ne partage pas ses infos (site en JavaScript).`
              : "Aucune info récupérable depuis ce lien."}
            {spaHint?.alternate && (
              <>
                {" "}
                Essaie plutôt un lien <strong>{spaHint.alternate}</strong> pour le même événement.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              onParsed(noDataStaged);
              setNoDataStaged(null);
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-bordeaux-700 underline-offset-4 hover:underline"
          >
            Continuer et remplir à la main
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
