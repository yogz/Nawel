"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, MessageCircle, Share2, X } from "lucide-react";
import { buildWhatsAppHref, buildWhatsAppMessage } from "@/features/sortie/lib/whatsapp-share";
import { trackOutingShareClicked } from "@/features/sortie/lib/outing-telemetry";

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
 * `?from=create`. Surfaces the share affordances (WhatsApp + native share)
 * right at the top so they don't have to hunt for them.
 *
 * While visible, this banner is the sole share region — the page's regular
 * `ShareActions` row is hidden to avoid duplicating the same buttons. Closing
 * the banner ends the creation moment; the normal share row re-appears on the
 * next navigation (when `?from=create` is gone).
 */
export function CreateSuccessBanner({ url, title, startsAt, firstName }: Props) {
  const [visible, setVisible] = useState(true);
  // `navigator.share` n'existe que dans certains navigateurs (Safari iOS,
  // Chrome Android, Edge desktop récent). Quand absent, on masque le
  // bouton plutôt que de cracher un toast d'erreur sur Firefox desktop.
  const canNativeShare = useSyncExternalStore(NEVER_CHANGES, HAS_SHARE, HAS_SHARE_SERVER);

  if (!visible) {
    return null;
  }

  const whatsAppHref = buildWhatsAppHref({ title, url, startsAt, firstName });

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
      trackOutingShareClicked({ channel: "native", placement: "hero" });
    } catch {
      // L'utilisateur a annulé la sheet ou le navigateur a refusé
      // (gesture déjà consommé, contexte non-secure…). Pas de feedback
      // d'erreur — l'annulation est volontaire dans 99% des cas.
    }
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-acid-300 bg-acid-50 p-4">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-acid-600 text-surface-50"
      >
        <Check size={16} strokeWidth={3} />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-acid-700">C&rsquo;est en ligne.</p>
        <p className="mt-1 text-sm text-ink-500">Plus qu&rsquo;à inviter tes potes.</p>
        <div className="mt-3 flex items-center gap-2">
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutingShareClicked({ channel: "whatsapp", placement: "hero" })}
            className="inline-flex h-11 flex-1 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-hot-600 px-3 text-sm font-bold text-surface-50 transition-colors duration-300 hover:bg-hot-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-700 focus-visible:ring-offset-2 focus-visible:ring-offset-acid-50"
          >
            <MessageCircle size={16} strokeWidth={2.2} />
            Partager sur WhatsApp
          </a>
          {canNativeShare && (
            // Action secondaire — la sheet de partage native est un canal
            // alternatif (iMessage, Mail, Signal…), pas la voie principale.
            // En icon-only on libère l'espace pour le CTA WhatsApp qui
            // sinon déborde sur écran étroit.
            <button
              type="button"
              onClick={handleNativeShare}
              aria-label="Partager via une autre application"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-surface-200 text-ink-700 transition-colors duration-300 hover:border-ink-400 hover:bg-surface-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => setVisible(false)}
        className="grid size-7 place-items-center rounded-full text-ink-400 transition-colors duration-300 hover:bg-acid-100 hover:text-acid-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
