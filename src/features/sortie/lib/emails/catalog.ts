/**
 * Catalogue read-only des emails que Sortie envoie. Centralise pour
 * l'admin :
 *   - le nom lisible
 *   - le déclencheur (qui appelle, quand)
 *   - le path source (pour ouvrir le template dans l'IDE)
 *   - une fonction `render()` qui retourne { subject, html } à partir
 *     de mock-data hardcodée — pas de DB, pas de side-effect.
 *
 * Ajout d'un template : ajouter une entrée ici, le reste suit
 * automatiquement (page admin + count).
 */
import {
  buildSortieAuthEmail,
  buildSortieClaimPromptEmail,
  buildSortieFollowGateEmail,
} from "@/lib/auth-emails";
import {
  debtReminderEmail,
  j1ReminderEmail,
  newFollowerEmail,
  outingCancelledEmail,
  outingModifiedEmail,
  paymentConfirmedEmail,
  paymentDeclaredEmail,
  purchaseConfirmedEmail,
  rsvpClosedEmail,
  rsvpReceivedEmail,
  ticketAvailableEmail,
  timeslotPickedEmail,
} from "./templates";

export type EmailCatalogEntry = {
  id: string;
  name: string;
  /** Quand cet email est envoyé, en une phrase. */
  trigger: string;
  /** `path:line` relatif au repo, pour le lien "voir le code". */
  sourcePath: string;
  render: () => { subject: string; html: string };
};

// Mock data réutilisée — gardée stable pour que les previews ne flickent
// pas entre deux refreshes (et qu'on puisse comparer un changement de
// template à mock identique).
const MOCK_OUTING_TITLE = "Raclette chez Léa";
const MOCK_OUTING_URL = "https://sortie.colist.fr/raclette-az9k";
const MOCK_OUTING_DATE = new Date("2026-12-21T19:30:00+01:00");
const MOCK_HOME_URL = "https://sortie.colist.fr";
const MOCK_DEBTS_URL = "https://sortie.colist.fr/raclette-az9k/dettes";
const MOCK_CTA_URL = "https://sortie.colist.fr/login?token=preview";

export const EMAIL_CATALOG: EmailCatalogEntry[] = [
  // --- Outing flow ---
  {
    id: "rsvp-received",
    name: "RSVP reçu (notif organisateur)",
    trigger: "Server Action `rsvpAction` — à chaque réponse oui/non/handle_own.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:164",
    render: () =>
      rsvpReceivedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        responderName: "Bob",
        response: "yes",
        extraAdults: 1,
        extraChildren: 0,
      }),
  },
  {
    id: "timeslot-picked",
    name: "Date choisie après sondage",
    trigger: "Server Action `pickTimeslotAction` — l'orga fige la date.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:237",
    render: () =>
      timeslotPickedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        fixedDatetime: MOCK_OUTING_DATE,
        location: "Chez Léa, 12 rue Oberkampf",
      }),
  },
  {
    id: "outing-modified",
    name: "Sortie modifiée",
    trigger:
      "Server Action `editOutingAction` — quand titre / date / lieu / deadline / lien billet change.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:351",
    render: () =>
      outingModifiedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        changes: [
          { label: "Date", before: "21 déc. 19:30", after: "22 déc. 20:00" },
          { label: "Lieu", before: "Chez Léa", after: "Chez Karim, 8 rue Saint-Maur" },
        ],
      }),
  },
  {
    id: "outing-cancelled",
    name: "Sortie annulée",
    trigger: "Server Action `cancelOutingAction` — l'orga annule.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:207",
    render: () =>
      outingCancelledEmail({
        outingTitle: MOCK_OUTING_TITLE,
        homeUrl: MOCK_HOME_URL,
      }),
  },
  {
    id: "rsvp-closed",
    name: "Liste close (deadline passée)",
    trigger: "Cron sweeper quotidien (07:00) — quand `deadlineAt < now()`.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:277",
    render: () =>
      rsvpClosedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        fixedDatetime: MOCK_OUTING_DATE,
        location: "Chez Léa, 12 rue Oberkampf",
      }),
  },
  {
    id: "rsvp-closed-vote-pending",
    name: "Liste close — sondage non tranché",
    trigger:
      "Cron sweeper quotidien (07:00) — variante quand mode=vote ET chosenTimeslotId=null à la cloture.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:277",
    render: () =>
      rsvpClosedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        fixedDatetime: null,
        location: "Chez Léa, 12 rue Oberkampf",
        awaitingPick: true,
      }),
  },
  {
    id: "j1-reminder",
    name: "Rappel J-1",
    trigger: "Cron sweeper quotidien (07:00) — sortie dans [now, now+48h].",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:314",
    render: () =>
      j1ReminderEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingUrl: MOCK_OUTING_URL,
        fixedDatetime: MOCK_OUTING_DATE,
        location: "Chez Léa, 12 rue Oberkampf",
      }),
  },

  // --- Money flow ---
  {
    id: "purchase-confirmed",
    name: "Achat confirmé (dette à régler)",
    trigger: "Server Action `declarePurchaseAction` — l'acheteur déclare le ticket.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:59",
    render: () =>
      purchaseConfirmedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingDate: MOCK_OUTING_DATE,
        buyerName: "Léa",
        debtorName: "Bob",
        amountCents: 2400,
        outingUrl: MOCK_OUTING_URL,
        debtsUrl: MOCK_DEBTS_URL,
        methods: [
          { type: "iban", valuePreview: "FR76 …42 1234", displayLabel: "Compte perso" },
          { type: "lydia", valuePreview: "+33 6 12 34 56 78", displayLabel: null },
        ],
      }),
  },
  {
    id: "payment-declared",
    name: "« J'ai payé » (notif acheteur)",
    trigger: "Server Action `declarePaymentAction` — un débiteur dit avoir payé.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:102",
    render: () =>
      paymentDeclaredEmail({
        outingTitle: MOCK_OUTING_TITLE,
        debtorName: "Bob",
        amountCents: 2400,
        debtsUrl: MOCK_DEBTS_URL,
      }),
  },
  {
    id: "debt-reminder",
    name: "Relance dette (par email)",
    trigger:
      "Server Action `remindDebtAction` — créancier tape « Relancer par email » sur une dette pending. Rate-limit 1×/48h par dette via audit_log.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:130",
    render: () =>
      debtReminderEmail({
        outingTitle: MOCK_OUTING_TITLE,
        creditorName: "Léa",
        amountCents: 2400,
        debtsUrl: MOCK_DEBTS_URL,
      }),
  },
  {
    id: "payment-confirmed",
    name: "Paiement confirmé (notif débiteur)",
    trigger: "Server Action `confirmPaymentReceivedAction` — l'acheteur confirme avoir reçu.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:134",
    render: () =>
      paymentConfirmedEmail({
        outingTitle: MOCK_OUTING_TITLE,
        creditorName: "Léa",
        amountCents: 2400,
        outingUrl: MOCK_OUTING_URL,
      }),
  },

  // --- Tickets ---
  {
    id: "ticket-available-participant",
    name: "Billet nominatif disponible",
    trigger:
      "Server Action `createTicketAction` (scope=participant) — l'orga uploade un billet nominatif.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:463",
    render: () =>
      ticketAvailableEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingDate: MOCK_OUTING_DATE,
        ticketsUrl: `${MOCK_OUTING_URL}/billets`,
        scope: "participant",
        recipientName: "Bob",
      }),
  },
  {
    id: "ticket-available-outing",
    name: "Billet groupé disponible",
    trigger:
      "Server Action `createTicketAction` (scope=outing) — diffusé à tous les participants actifs (yes / handle_own).",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:463",
    render: () =>
      ticketAvailableEmail({
        outingTitle: MOCK_OUTING_TITLE,
        outingDate: MOCK_OUTING_DATE,
        ticketsUrl: `${MOCK_OUTING_URL}/billets`,
        scope: "outing",
        recipientName: "Bob",
      }),
  },

  // --- Follow ---
  {
    id: "new-follower",
    name: "Nouveau suiveur",
    trigger:
      "Server Action `followUserAction` — notifie le créateur quand quelqu'un commence à le suivre.",
    sourcePath: "src/features/sortie/lib/emails/templates.ts:380",
    render: () =>
      newFollowerEmail({
        followedName: "Léa",
        followerName: "Bob",
        manageUrl: "https://sortie.colist.fr/moi",
      }),
  },

  // --- Auth ---
  {
    id: "auth-magic-link",
    name: "Magic link",
    trigger: "Better Auth — login sans mot de passe via `sendMagicLink`.",
    sourcePath: "src/lib/auth-emails.ts:73",
    render: () => buildSortieAuthEmail({ kind: "magic-link", ctaUrl: MOCK_CTA_URL }),
  },
  {
    id: "auth-reset-password",
    name: "Reset mot de passe",
    trigger: "Better Auth — `sendResetPassword`.",
    sourcePath: "src/lib/auth-emails.ts:73",
    render: () => buildSortieAuthEmail({ kind: "reset-password", ctaUrl: MOCK_CTA_URL }),
  },
  {
    id: "auth-email-verification",
    name: "Vérification d'email",
    trigger: "Better Auth — `sendVerificationEmail`.",
    sourcePath: "src/lib/auth-emails.ts:73",
    render: () => buildSortieAuthEmail({ kind: "email-verification", ctaUrl: MOCK_CTA_URL }),
  },
  {
    id: "auth-claim-prompt",
    name: "Bienvenue post-claim (≥ 2 RSVP même orga)",
    trigger:
      "Server Action `triggerClaimPromptAction` — déclenché à la 2ᵉ RSVP d'un anon avec email chez le même orga.",
    sourcePath: "src/lib/auth-emails.ts:91",
    render: () =>
      buildSortieClaimPromptEmail({
        ctaUrl: MOCK_CTA_URL,
        creatorName: "Léa",
        outings: [
          { title: MOCK_OUTING_TITLE, dateStr: "21 déc." },
          { title: "Brunch dimanche", dateStr: "12 janv." },
        ],
      }),
  },
  {
    id: "auth-follow-gate",
    name: "Confirme email pour suivre",
    trigger:
      "Server Action `submitFollowEmailAction` — déclenché quand un user logué non-vérifié tente de follow depuis `/@<creator>?k=<token>`.",
    sourcePath: "src/lib/auth-emails.ts",
    render: () => buildSortieFollowGateEmail({ ctaUrl: MOCK_CTA_URL, creatorName: "Léa" }),
  },
];
