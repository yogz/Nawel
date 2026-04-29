import { after } from "next/server";

/**
 * Schedule un effet après que la réponse Server Action soit envoyée au
 * client. Bénéfice : la latence perçue ne paie pas le coût de cet effet
 * (telemetry, audit log, cleanup, etc.).
 *
 * Hors d'un contexte request scope (script, test, build), `after()` jette ;
 * on retombe sur un fire-and-forget classique qui catch les erreurs pour
 * ne jamais leak vers l'appelant.
 */
export function runAfterResponse(fn: () => Promise<unknown>): void {
  const safe = () => {
    fn().catch(() => {});
  };
  try {
    after(safe);
  } catch {
    safe();
  }
}
