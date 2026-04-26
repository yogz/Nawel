"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, MessageCircle, Share2, X } from "lucide-react";
import { buildWhatsAppHref, buildWhatsAppMessage } from "@/features/sortie/lib/whatsapp-share";

// Détection statique de la Web Share API. `useSyncExternalStore` est le
// pattern React-officiel pour exposer une valeur d'un "store externe"
// (ici la présence de `navigator.share`) en restant SSR-safe : le snapshot
// serveur est `false` (rien à partager côté Node), le client lit la
// vraie valeur au mount, et hydration ne génère pas de mismatch parce
// que React fait l'arbitrage. Pas d'`useEffect` → pas de cascade render
// flaggée par le compilateur.
const NEVER_CHANGES = () => () => {};
const HAS_SHARE = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const HAS_SHARE_SERVER = () => false;

type Props = {
  url: string;
  title: string;
  startsAt: Date | null;
  firstName?: string | null;
};

/**
 * One-off banner rendered on the outing page when the creator arrived via
 * `?from=create`. Surfaces the share affordances (WhatsApp + native share +
 * copy) right at the top so they don't have to hunt for them.
 *
 * Hierarchy : WhatsApp est l'usage dominant en France pour partager une
 * sortie entre potes, donc c'est le CTA primaire pleine largeur. Sous-rangée
 * secondaire : `Partager` (Web Share API → iMessage/Telegram/Signal/AirDrop
 * via la sheet native iOS/Android, indispensable pour les ~30% qui ne
 * partagent pas via WhatsApp) et `Copier` en fallback universel.
 *
 * While visible, this banner is the sole share region — the page's regular
 * `ShareActions` row is hidden to avoid duplicating the same buttons. Closing
 * the banner ends the creation moment; the normal share row re-appears on the
 * next navigation (when `?from=create` is gone).
 */
export function CreateSuccessBanner({ url, title, startsAt, firstName }: Props) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  // `navigator.share` n'existe que dans certains navigateurs (Safari iOS,
  // Chrome Android, Edge desktop récent). Quand absent, on masque le
  // bouton plutôt que de cracher un toast d'erreur sur Firefox desktop.
  const canNativeShare = useSyncExternalStore(NEVER_CHANGES, HAS_SHARE, HAS_SHARE_SERVER);

  if (!visible) {
    return null;
  }

  const whatsAppHref = buildWhatsAppHref({ title, url, startsAt, firstName });

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

  async function handleNativeShare() {
    try {
      await navigator.share({
        title,
        // `text` est ce qui apparaît dans le corps du message (iMessage,
        // Mail…). On reprend le même formattage que WhatsApp pour rester
        // cohérent : nom + date + appel à l'action. L'URL est passée
        // séparément pour que l'OS la reconnaisse comme attachable.
        text: buildWhatsAppMessage({ title, url, startsAt, firstName }),
        url,
      });
    } catch {
      // L'utilisateur a annulé la sheet ou le navigateur a refusé
      // (gesture déjà consommé, contexte non-secure…). Pas de feedback
      // d'erreur — l'annulation est volontaire dans 99% des cas.
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
        <p className="font-semibold text-bordeaux-700">C&rsquo;est en ligne.</p>
        <p className="mt-1 text-sm text-encre-500">Plus qu&rsquo;à inviter tes potes.</p>
        <div className="mt-3 flex flex-col gap-2">
          {/* Primary CTA pleine largeur — WhatsApp est l'usage majoritaire
              FR, on lui donne le poids visuel correspondant. */}
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-or-600 px-4 text-sm font-bold text-ivoire-50 transition-colors duration-300 hover:bg-or-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bordeaux-50"
          >
            <MessageCircle size={16} strokeWidth={2.2} />
            Partager sur WhatsApp
          </a>
          {/* Sous-rangée secondaire : sheet native + copier. La sheet
              native est cachée sur les navigateurs qui ne la supportent
              pas (Firefox desktop principalement) ; dans ce cas Copier
              prend toute la largeur, comportement géré par `flex-1`. */}
          <div className="flex items-center gap-2">
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                aria-label="Partager via une autre application"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-encre-300 bg-ivoire-200 px-4 text-sm font-semibold text-encre-700 transition-colors duration-300 hover:border-encre-400 hover:bg-ivoire-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-encre-300"
              >
                <Share2 size={14} />
                Partager
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Lien copié" : "Copier le lien"}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-encre-300 bg-ivoire-200 px-4 text-sm font-semibold text-encre-700 transition-colors duration-300 hover:border-encre-400 hover:bg-ivoire-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-encre-300"
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
              {copied ? "Copié" : "Copier le lien"}
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => setVisible(false)}
        className="grid size-7 place-items-center rounded-full text-encre-400 transition-colors duration-300 hover:bg-bordeaux-100 hover:text-bordeaux-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
