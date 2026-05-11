/**
 * Wrapper aria-live pour les useActionState. Les server actions
 * mutent l'état sans rerender visible (revalidatePath suffit côté
 * UI), donc un screen reader n'entend rien quand l'action réussit ou
 * échoue. Ce composant injecte un live region sr-only qui annonce
 * le message courant (succès, erreur, ou idle).
 *
 * Politeness `polite` : on attend une pause naturelle pour annoncer,
 * ce qui évite d'interrompre la lecture du formulaire. `assertive`
 * n'est justifié que pour des alertes critiques (WCAG 4.1.3).
 */
export function ActionStatus({ message }: { message?: string | null }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {message ?? ""}
    </span>
  );
}
