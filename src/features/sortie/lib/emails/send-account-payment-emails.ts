import {
  accountMethodChangedEmail,
  accountMethodConfirmEmail,
  type PaymentMethodPreview,
} from "./templates";
import { BASE_URL, safeSend } from "./shared";

// Chemins publics (le proxy re-préfixe `/sortie` en interne).
const ACCOUNT_URL = `${BASE_URL}/moi/argent#moyens`;

/**
 * Lien de confirmation d'un moyen ajouté sur le compte. Envoyé à l'adresse
 * du compte connecté — c'est elle, pas la session, qui valide l'ajout.
 */
export async function sendAccountMethodConfirmEmail(args: {
  to: string;
  type: PaymentMethodPreview["type"];
  valuePreview: string;
  displayLabel: string | null;
  token: string;
}): Promise<void> {
  const { subject, html } = accountMethodConfirmEmail({
    type: args.type,
    valuePreview: args.valuePreview,
    displayLabel: args.displayLabel,
    confirmUrl: `${BASE_URL}/moi/argent/confirmer?t=${encodeURIComponent(args.token)}`,
  });
  await safeSend({ to: args.to, subject, html, trigger: "account-method-confirm" });
}

/** Notification à chaque ajout confirmé et à chaque retrait. */
export async function sendAccountMethodChangedEmail(args: {
  to: string;
  change: "confirmed" | "removed";
  type: PaymentMethodPreview["type"];
  valuePreview: string;
}): Promise<void> {
  const { subject, html } = accountMethodChangedEmail({
    change: args.change,
    type: args.type,
    valuePreview: args.valuePreview,
    accountUrl: ACCOUNT_URL,
  });
  await safeSend({ to: args.to, subject, html, trigger: `account-method-${args.change}` });
}
