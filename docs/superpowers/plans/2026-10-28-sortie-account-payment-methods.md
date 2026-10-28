# Sortie — moyens de paiement sur le compte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un organisateur connecté (e-mail vérifié) enregistre ses moyens de paiement une fois sur son compte (ajout confirmé par e-mail), et les coche pour qu'ils soient copiés à chaque achat qu'il déclare, donc présents dans l'e-mail « ta part ».

**Architecture:** Nouvelle table `sortie.user_payment_methods` (chiffré identique à l'existant, statut en attente / confirmé). Règles pures dans `src/features/sortie/lib/account-payment/rules.ts` (droits, copie, libellé, doublons, plafond). Actions serveur de compte + route de confirmation par jeton. Copie du chiffré (sans déchiffrer) dans la transaction de `declarePurchaseAction`, limitée aux identifiants cochés.

**Tech Stack:** Next.js 16, Drizzle (migration via `npm run db:generate`), Zod, Better Auth session, AES-256-GCM existant (`src/lib/crypto.ts`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-sortie-account-payment-methods-design.md` (§5 bis fait autorité).

## Global Constraints

- Base locale = prod : aucun test n'écrit en base ; actions vérifiées via règles pures + typecheck ; rendu e-mail via tests de gabarit.
- Jamais de `decryptSecret` ajouté ; copie du chiffré tel quel. Aucune valeur en clair dans logs, e-mails, navigateur de l'organisateur.
- Compte : `session.user` requis et `emailVerified === true` ; jamais le cookie.
- Copie à l'achat : `sessionUserId !== null && buyer.userId === sessionUserId`, et seulement les ids cochés, confirmés, appartenant à ce compte.
- Ajout sur le compte = en attente jusqu'au lien e-mail (jeton aléatoire 32 octets, stocké haché SHA-256, 15 min, usage unique). Notification e-mail à la confirmation et au retrait.
- Libellé : ≤ 40 caractères, `sanitizeStrictText`, refus de toute suite > 8 chiffres.
- 5 moyens confirmés max par compte ; rate-limit `acct-pm:<userId>` 10 / 3600 s ; doublon = même type + même aperçu.
- Plus aucune écriture de `sortie:lastPM:*` ; purge au chargement du gestionnaire.
- FR-only, ≥ 44 px, `motion-safe:`, `aria-*`.
- Branche `feat/sortie-account-payment-methods`, un commit par tâche.

## Review Focus

1. Compte mot de passe non vérifié (pré-création par un tiers) → aucun ajout possible ; compte vérifié avec ajout non confirmé → jamais copié. Tests Task 2.
2. Acheteur reconnu par cookie seul alors que la ligne porte un `userId` (rattachement e-mail) → pas de copie, pas d'ajout/retrait par sortie. Tests Task 2.
3. Ids cochés forgés (moyen d'un autre compte, ou non confirmé) → ignorés. Test Task 2 (fonction de sélection).
4. Jeton de confirmation expiré / réutilisé / d'un autre compte → refus. Tests Task 3 (fonction pure de validation).
5. Libellé « vire sur FR7612345678… » → refusé. Test Task 2.

---

### Task 1: Table `user_payment_methods`

**Files:** Modify `drizzle/sortie-schema.ts` ; generated `drizzle/migrations/0053_*.sql`.

**Interfaces:** Produces `userPaymentMethods` : `id` uuid pk, `userId` text FK `user.id` cascade, `type` paymentMethodType, `valueEncrypted` text, `valuePreview` varchar(80), `displayLabel` varchar(40) null, `confirmedAt` timestamptz null, `confirmTokenHash` varchar(64) null, `confirmTokenExpiresAt` timestamptz null, `createdAt` ; index `user_id`.

- [ ] Step 1: ajouter la table (commentaire : sécurité §5 bis, rotation de clés couvrant les deux tables).
- [ ] Step 2: `npm run db:generate` → un seul `CREATE TABLE` + FK + index ; relire.
- [ ] Step 3: `npm run typecheck` → 0.
- [ ] Step 4: Commit `feat(sortie): table des moyens de paiement du compte`.

### Task 2: Règles pures

**Files:** Create `src/features/sortie/lib/account-payment/rules.ts`, `rules.test.ts`.

**Interfaces:** Produces

- `mayManageAccountMethods(s: { userId: string | null; emailVerified: boolean | null }): boolean`
- `mayCopyAccountMethods(a: { sessionUserId: string | null; buyerUserId: string | null }): boolean`
- `mayEditOutingMethods(a: { rowUserId: string | null; sessionUserId: string | null }): boolean` — ligne avec `userId` ⇒ session identique ; ligne sans `userId` ⇒ vrai (comportement actuel).
- `validateMethodLabel(raw: string | undefined): { ok: true; label: string | null } | { ok: false; message: string }` — vide → null ; > 40 → « 40 caractères maximum. » ; `/\d{9,}/` sur la version sans espaces → « Pas de numéro dans le libellé. »
- `checkAccountMethodAdd(a: { existing: { type: string; valuePreview: string; confirmedAt: Date | null }[]; type: string; valuePreview: string }): { ok: true } | { ok: false; message: string }` — plafond 5 confirmés (« 5 moyens maximum. Retire-en un pour en ajouter un autre. »), doublon (« Tu as déjà un {IBAN|Lydia|Revolut|Wero} qui finit par {4 derniers}. »).
- `selectMethodsToCopy(a: { checkedIds: string[]; accountMethods: { id: string; confirmedAt: Date | null }[] }): string[]` — intersection avec les moyens confirmés du compte, ordre `accountMethods`.

- [ ] Step 1: tests (Review Focus 1, 2, 3, 5 + cas nominaux).
- [ ] Step 2: run → FAIL. Step 3: implémenter. Step 4: run → PASS.
- [ ] Step 5: Commit `feat(sortie): règles des moyens de paiement du compte`.

### Task 3: Actions de compte et confirmation par e-mail

**Files:** Create `src/features/sortie/actions/account-payment-actions.ts`, `src/features/sortie/lib/account-payment/confirm-token.ts` (+ test), `src/app/(sortie)/sortie/moi/argent/confirmer/route.ts` ; Modify `src/features/sortie/lib/emails/templates.ts` (+ test), `src/features/sortie/lib/audit.ts`.

**Interfaces:**

- `newConfirmToken(now: Date): { token: string; tokenHash: string; expiresAt: Date }` ; `checkConfirmToken(a: { row: { userId: string; confirmTokenHash: string | null; confirmTokenExpiresAt: Date | null; confirmedAt: Date | null } | undefined; sessionUserId: string | null; now: Date }): { ok: true } | { ok: false; reason: "invalid" | "expired" | "used" | "other-account" }` (le hachage du jeton reçu sert de clé de recherche).
- `addAccountPaymentMethodAction(prev, formData)` : règles Task 2, Zod existant (IBAN `isValidIban` / handles 4–50), `encryptSecret`, aperçu existant, insert en attente, e-mail « Confirme ton nouveau moyen de paiement » avec lien `/moi/argent/confirmer?t=<token>`, audit ADDED.
- `removeAccountPaymentMethodAction(prev, formData)` : propriétaire seulement, delete, e-mail de notification, audit REMOVED.
- Route GET `confirmer` : session requise (sinon redirection connexion), `checkConfirmToken`, met `confirmedAt`, efface le jeton, e-mail de notification, audit CONFIRMED, redirige `/moi/argent?moyen=confirme#moyens`.
- Gabarits : `accountMethodConfirmEmail`, `accountMethodChangedEmail` (aperçu seul).

- [ ] Step 1: tests `confirm-token` (Review Focus 4) + gabarits (aucune valeur en clair, lien présent).
- [ ] Step 2: FAIL. Step 3: implémenter. Step 4: PASS + typecheck.
- [ ] Step 5: Commit `feat(sortie): enregistrer ses moyens de paiement sur son compte (confirmés par e-mail)`.

### Task 4: Section « Tes moyens de paiement » et fin du cache en clair

**Files:** Create `src/features/sortie/components/account-payment-methods.tsx` (+ test) ; Modify `src/app/(sortie)/sortie/moi/argent/page.tsx`, `src/features/sortie/components/payment-methods-manager.tsx`, `src/features/sortie/lib/payment-method-prefill.ts`.

- [ ] Step 1: tests composant : état vide (formulaire ouvert + texte), liste d'aperçus avec « en attente de confirmation », retrait en deux temps, aucun champ ne contient de valeur pré-remplie depuis `localStorage`.
- [ ] Step 2: FAIL. Step 3: implémenter selon §5 bis (textes exacts) ; `payment-method-prefill` : supprimer `saveLastValue`/`readLastValue`, exposer `purgeLegacyPrefill()` appelé au montage des deux gestionnaires.
- [ ] Step 4: PASS + typecheck + lint.
- [ ] Step 5: Commit `feat(sortie): section « Tes moyens de paiement » et fin du cache navigateur en clair`.

### Task 5: Copie à l'achat (cases à cocher)

**Files:** Modify `src/features/sortie/actions/purchase-actions.ts`, `src/app/(sortie)/sortie/[slugOrId]/achat/page.tsx`, `src/features/sortie/components/purchase-form.tsx` (+ test), `src/features/sortie/lib/audit.ts`.

- [ ] Step 1: tests formulaire : connecté avec moyens → cases cochées par défaut + phrase ; sans moyen → lien Mon argent (nouvel onglet) ; non éligible → texte actuel (« IBAN »).
- [ ] Step 2: FAIL. Step 3: page : `mayCopyAccountMethods` + moyens confirmés (aperçus seulement) ; action : lire `copyMethodIds` (getAll), dans la transaction après l'insert achat : `mayCopyAccountMethods` puis `selectMethodsToCopy` sur les lignes du compte (relues), insert dans `purchaser_payment_methods` (`participantId: me.id`, chiffré copié), audit COPIED.
- [ ] Step 4: PASS + typecheck.
- [ ] Step 5: Commit `feat(sortie): les moyens du compte sont joints à l'achat`.

### Task 6: Par sortie — garde de session, doublons, texte

**Files:** Modify `src/features/sortie/actions/payment-method-actions.ts`, `src/app/(sortie)/sortie/[slugOrId]/paiement/page.tsx`.

- [ ] Step 1: test : `mayEditOutingMethods` déjà couvert (Task 2) ; ajouter test du doublon par sortie via `checkAccountMethodAdd`-like helper `isDuplicateMethod(existing, type, preview)` exporté de `rules.ts`.
- [ ] Step 2/3: brancher `mayEditOutingMethods` dans add/remove (session via `getCurrentParticipant().userId`), refus doublon « Déjà ajouté pour cette sortie. », phrase `/paiement`.
- [ ] Step 4: PASS + typecheck. Step 5: Commit `fix(sortie): moyens de paiement par sortie protégés par la session`.

### Task 7: Texte de l'e-mail « ta part »

**Files:** Modify `templates.ts` (`methodsBlock`, `purchaseConfirmedEmail`), test `purchase-confirmed-email.test.ts`.

- [ ] Step 1: tests : avec moyens → « Numéros masqués ici » ; sans → « {Prénom} n'a pas encore indiqué comment le rembourser. »
- [ ] Step 2: FAIL. Step 3: implémenter. Step 4: PASS. Step 5: Commit `feat(sortie): e-mail « ta part » plus clair sur les moyens de paiement`.

### Task 8: Vérification finale

- [ ] `npm test` (6 échecs CoList préexistants tolérés), typecheck, lint ; relecture finale indépendante (Review Focus + §5 bis).
