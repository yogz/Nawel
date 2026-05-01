import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import type { PendingAction } from "@/features/sortie/lib/pending-actions";

const VISIBLE_LIMIT = 3;

type Props = {
  actions: PendingAction[];
};

/**
 * Bandeau "à toi de jouer" sur la home : agrège les actions en attente
 * du user logged-in (sondages tranchés à faire, achats, RSVP urgents) à
 * travers toutes ses outings. Le hero LiveStatusHero ne parle que d'une
 * sortie ; cette strip fait le filet de sécurité pour tout le reste.
 *
 * Forme : liste plate, 3 visibles + "voir N autres ▸" repliable
 * (pattern PastSection). Chaque item est un Link vers la page detail
 * de la sortie — V1 sans raccourcis action-spécifiques, on évite la
 * surface UI à maintenir et on laisse la page detail porter ses CTA
 * propres (déjà saillants une fois sur place).
 *
 * Tone : hot (◉) pour les actions en retard / urgentes (achat, sondage
 * post-deadline), acid (◉) pour les modérées (RSVP qui approche).
 * Aligné sémantiquement avec `Eyebrow.tone` et `DeadlineBadge`.
 */
export function PendingActionsStrip({ actions }: Props) {
  if (actions.length === 0) {
    return null;
  }

  const visible = actions.slice(0, VISIBLE_LIMIT);
  const hidden = actions.slice(VISIBLE_LIMIT);
  const tone = actions.some((a) => a.tone === "hot") ? "hot" : "acid";

  return (
    <section
      aria-label="Actions en attente"
      className="mb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 duration-motion-emphasized ease-motion-emphasized"
    >
      <Eyebrow tone={tone} glow className="mb-3">
        ─ à toi de jouer ─
        <span className="ml-2 text-ink-400">{String(actions.length).padStart(2, "0")}</span>
      </Eyebrow>

      <ul className="flex flex-col">
        {visible.map((action, idx) => (
          <li key={action.outingId} className={cn("border-ink-100", idx > 0 && "border-t")}>
            <ActionRow action={action} />
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <details className="group mt-1">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 border-t border-ink-100 px-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-acid-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50">
            <span>+ voir les {String(hidden.length).padStart(2, "0")} autres</span>
            <ChevronRight
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-90"
            />
          </summary>
          <ul className="flex flex-col">
            {hidden.map((action) => (
              <li key={action.outingId} className="border-t border-ink-100">
                <ActionRow action={action} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ActionRow({ action }: { action: PendingAction }) {
  const href = action.slug ? `/${action.slug}-${action.shortId}` : `/${action.shortId}`;

  // Tonal classes — alignées sur `Eyebrow` (text-hot-500 / text-acid-600)
  // et `DeadlineBadge` (halo hot pour urgence). Le halo n'est appliqué
  // qu'au tone hot pour réserver la signalétique pulsée à l'urgence —
  // multiplier les halos dilue leur sens.
  const isHot = action.tone === "hot";

  return (
    <Link
      href={href}
      aria-label={`${action.label} — ${action.title}`}
      className="group/row flex min-h-[56px] items-center gap-3 px-1 py-3 transition-all duration-300 hover:bg-surface-100 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 rounded-lg"
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isHot
            ? "sortie-deadline-halo bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]"
            : "bg-acid-600 shadow-[0_0_8px_var(--sortie-acid)]"
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.22em]",
            isHot ? "text-hot-500" : "text-acid-600"
          )}
        >
          {action.label}
        </p>
        <p className="mt-1 truncate text-[15px] font-semibold leading-tight text-ink-700">
          {action.title}
        </p>
      </div>
      <ArrowRight
        size={16}
        strokeWidth={2.4}
        aria-hidden="true"
        className="shrink-0 text-ink-400 transition-transform duration-300 group-hover/row:translate-x-0.5 group-hover/row:text-ink-700"
      />
    </Link>
  );
}
