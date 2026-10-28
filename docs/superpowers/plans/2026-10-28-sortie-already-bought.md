# Sortie — « J'ai déjà les billets » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un organisateur connecté crée une sortie dont il a déjà les billets : pas de date limite ni d'e-mail aux abonnés, il choisit qui vient (habitués ou nouveaux), déclare l'achat, et chacun reçoit un seul e-mail avec sa part.

**Architecture:** Une colonne `outings.already_bought` marque ces sorties. Toutes les décisions (création, réponses fermées, droit de déclarer l'achat, regroupement des habitués, plan d'ajout/retrait de participants) sont des fonctions pures testées dans `src/features/sortie/lib/already-bought/` ; les actions serveur et pages ne font que les appeler. Le code d'argent existant (`declarePurchaseAction`, dettes, e-mail) est réutilisé, avec une seule garde ajoutée.

**Tech Stack:** Next.js 16 (Server Actions, RSC), React 19, Drizzle (migration via `npm run db:generate`), Zod, Vitest, Tailwind (« Acid Cabinet »).

**Spec:** `docs/superpowers/specs/2026-10-28-sortie-already-bought-design.md` (§5 bis fait autorité sur §5).

## Global Constraints

- Base locale = base de prod : aucun test n'écrit en base ; les actions sont testées via leurs fonctions pures, le câblage via typecheck + vérification finale en ligne avec l'owner.
- Migration : uniquement `npm run db:generate` puis relecture du SQL généré (additif, `default false`) ; jamais `db:push`.
- Fonctionnalité réservée à `session.user` (compte connecté) ; comparaisons `outing.creatorUserId === session.user.id`, jamais `isOutingOwner` pour ces actions.
- Le navigateur ne reçoit jamais d'adresse e-mail ni de `userId` d'habitué.
- Jamais d'appel à `ensureSilentUserAccount` ni de `userId` posé depuis un e-mail saisi.
- Plafonds : ≤ 20 personnes par appel ; ≤ 100 « oui » par sortie ; ≤ 10 nouvelles adresses par sortie ; ≤ 20 nouvelles adresses par organisateur / 24 h ; action ≤ 10 appels / h ; ≤ 5 créations « billets déjà pris » / organisateur / jour.
- Dates futures uniquement pour ces sorties.
- Sortie FR-only (chaînes en dur), touch targets ≥ 44 px, `motion-safe:`, `aria-*` sur les contrôles custom.
- Prénoms via `sanitizeStrictText(…, 100)`, e-mails via Zod `.email()` + minuscules + `max(255)`.
- Une branche `feat/sortie-already-bought`, un commit par tâche, conventional commits.

## Review Focus

1. Formulaire de création forgé avec `alreadyBought=on` par un créateur non connecté ou en mode sondage → refusé côté serveur. Test Task 2.
2. Deux habitués homonymes, l'un avec e-mail, l'autre sans → deux entrées distinctes, jamais fusionnées. Test Task 5.
3. Liste soumise depuis un onglet périmé alors que l'achat a été déclaré entre-temps → refus, renvoi vers `/dettes` (revérification dans la transaction). Test Task 6 (fonction pure) + garde dans l'action.
4. L'organisateur décoché / absent de la liste soumise → toujours inscrit. Test Task 6.
5. Brouillon du wizard restauré avec l'option cochée puis passage en sondage (2 créneaux) → option ignorée, sortie normale. Test Task 2 (résolveur serveur) ; wizard masque l'option.

---

## File Structure

| Fichier                                                                                                           | Responsabilité                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle/sortie-schema.ts` + `drizzle/migrations/0052_*.sql`                                                      | Colonne `already_bought`.                                                                                                                                                                                                 |
| `src/features/sortie/lib/already-bought/rules.ts`                                                                 | Prédicats purs : création, réponses ouvertes, droit d'acheter, édition.                                                                                                                                                   |
| `src/features/sortie/lib/already-bought/regulars.ts`                                                              | Regroupement pur des habitués + clés opaques.                                                                                                                                                                             |
| `src/features/sortie/lib/already-bought/participant-plan.ts`                                                      | Plan pur d'ajout / mise à jour / retrait + plafonds.                                                                                                                                                                      |
| `src/features/sortie/queries/regulars-queries.ts`                                                                 | Lecture des lignes brutes d'habitués (Drizzle).                                                                                                                                                                           |
| `src/features/sortie/actions/who-is-coming-actions.ts`                                                            | Action « Continuer » de la page Qui vient.                                                                                                                                                                                |
| `src/app/(sortie)/sortie/[slugOrId]/qui-vient/page.tsx` + `src/features/sortie/components/who-is-coming-form.tsx` | Page et formulaire.                                                                                                                                                                                                       |
| Modifiés                                                                                                          | `outing-actions.ts`, `schemas.ts`, `participant-actions.ts`, `purchase-actions.ts`, `achat/page.tsx`, `purchase-form.tsx`, `create-wizard/index.tsx`, `[slugOrId]/page.tsx`, `pending-actions.ts`, `emails/templates.ts`. |

---

### Task 1: Colonne `already_bought`

**Files:** Modify `drizzle/sortie-schema.ts` (table `outings`) ; Create `drizzle/migrations/0052_*.sql` (généré).

**Interfaces:** Produces `outings.alreadyBought: boolean` (DB `already_bought boolean not null default false`).

- [ ] **Step 1:** Ajouter `alreadyBought: boolean("already_bought").notNull().default(false)` avec un commentaire (« sortie créée billets déjà pris : pas de RSVP, achat réservé au créateur »).
- [ ] **Step 2:** `npm run db:generate` → un seul fichier SQL ; vérifier qu'il ne contient que `ALTER TABLE "sortie"."outings" ADD COLUMN "already_bought" boolean DEFAULT false NOT NULL;`.
- [ ] **Step 3:** `npm run typecheck` → 0 erreur.
- [ ] **Step 4:** Commit `feat(sortie): colonne already_bought sur les sorties`.

### Task 2: Règles pures + création « billets déjà pris »

**Files:** Create `src/features/sortie/lib/already-bought/rules.ts`, `rules.test.ts` ; Modify `src/features/sortie/actions/schemas.ts` (createOutingSchema : `alreadyBought` checkbox facultative), `src/features/sortie/actions/outing-actions.ts` (createOutingAction).

**Interfaces:**

- Produces:
  - `resolveAlreadyBoughtCreation(a: { requested: boolean; sessionUserId: string | null; mode: "fixed" | "vote"; startsAt: Date | null; now: Date }): { ok: true; alreadyBought: boolean } | { ok: false; message: string }` — `requested` faux → `{ok:true, alreadyBought:false}` ; vrai et non connecté → message « Connecte-toi pour créer une sortie dont tu as déjà les billets. » ; vrai et mode vote → `{ok:true, alreadyBought:false}` (option ignorée) ; vrai et `startsAt` absent ou ≤ now → « La date doit être à venir. ».
  - `acceptsResponses(o: { alreadyBought: boolean; status: string; deadlineAt: Date }, now: Date): boolean` — faux si `alreadyBought` ; sinon règle actuelle (`!(deadlineAt < now && status !== "open")`).

- [ ] **Step 1:** Tests : les 4 cas de `resolveAlreadyBoughtCreation` (dont Review Focus 1 et 5) ; `acceptsResponses` faux pour `alreadyBought` même `open` / deadline future, et identique à l'existant sinon.
- [ ] **Step 2:** `npx vitest run src/features/sortie/lib/already-bought` → FAIL (module absent).
- [ ] **Step 3:** Implémenter `rules.ts`. Dans `createOutingAction` : appeler le résolveur (avec `user?.id ?? null`, jamais l'id silencieux) ; si `alreadyBought` : rate-limit `already-bought-create:${user.id}` 5 / 86400 s ; insert avec `status: "awaiting_purchase"`, `deadlineAt: now`, `alreadyBought: true` ; ne pas appeler `sendNewOutingBroadcast` ; rediriger vers `/${canonical}/qui-vient`.
- [ ] **Step 4:** Tests → PASS ; `npm run typecheck` → 0.
- [ ] **Step 5:** Commit `feat(sortie): création d'une sortie « billets déjà pris »`.

### Task 3: Réponses fermées et modification sans réouverture

**Files:** Modify `participant-actions.ts` (rsvpAction, castVoteAction), `outing-actions.ts` (updateOutingAction), `src/app/(sortie)/sortie/[slugOrId]/modifier/page.tsx` + son formulaire (masquer la date limite) ; Test `rules.test.ts`.

**Interfaces:** Consumes `acceptsResponses` (Task 2). Produces `editKeepsDeadline(o: { alreadyBought: boolean }): boolean` et `editNotifiesParticipants(o: { alreadyBought: boolean; hasPurchase: boolean }): boolean` dans `rules.ts`.

- [ ] **Step 1:** Tests : `editKeepsDeadline` vrai si `alreadyBought` ; `editNotifiesParticipants` faux si `alreadyBought && !hasPurchase`, vrai sinon.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `rsvpAction` / `castVoteAction` : remplacer la condition deadline par `acceptsResponses` (message existant « Les réponses sont closes pour cette sortie. ») ; `castVoteAction` refuse aussi si `alreadyBought`. `updateOutingAction` : `deadlineAt` inchangé si `editKeepsDeadline`, et `sendOutingModifiedEmails` seulement si `editNotifiesParticipants` ; le schéma d'édition accepte l'absence de `rsvpDeadline` pour ces sorties. Formulaire de modification : champ date limite masqué si `alreadyBought`.
- [ ] **Step 4:** Tests sortie + typecheck → PASS / 0.
- [ ] **Step 5:** Commit `fix(sortie): une sortie « billets déjà pris » reste fermée aux réponses`.

### Task 4: Achat réservé à l'organisateur

**Files:** Modify `purchase-actions.ts` (declarePurchaseAction), `achat/page.tsx` ; Test `rules.test.ts`.

**Interfaces:** Produces `mayDeclarePurchase(a: { alreadyBought: boolean; creatorUserId: string | null; sessionUserId: string | null; myResponse: string | null }): boolean` — si `alreadyBought` : `sessionUserId !== null && sessionUserId === creatorUserId && myResponse === "yes"` ; sinon `myResponse === "yes"` (règle actuelle).

- [ ] **Step 1:** Tests : participant « oui » non créateur refusé sur `alreadyBought` ; créateur connecté accepté ; sortie normale inchangée.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Brancher dans `declarePurchaseAction` (message « Seul l'organisateur déclare l'achat de cette sortie. ») et dans `achat/page.tsx` (`notFound()` sinon). Aucun autre changement au code d'argent.
- [ ] **Step 4:** Tests + typecheck.
- [ ] **Step 5:** Commit `fix(sortie): achat d'une sortie « billets déjà pris » réservé à l'organisateur`.

### Task 5: Habitués

**Files:** Create `src/features/sortie/lib/already-bought/regulars.ts`, `regulars.test.ts`, `src/features/sortie/queries/regulars-queries.ts`.

**Interfaces:**

- Produces:
  - `type RegularRow = { userId: string | null; userName: string | null; anonName: string | null; email: string | null; outingId: string; outingTitle: string; startsAt: Date | null; extraAdults: number; extraChildren: number }`.
  - `type Regular = { key: string; name: string; hasEmail: boolean; outingsTogether: number; lastOutingTitle: string; lastOutingAt: Date | null; userId: string | null; email: string | null }` — serveur seulement.
  - `type RegularView = Pick<Regular, "key" | "name" | "hasEmail" | "outingsTogether" | "lastOutingTitle" | "lastOutingAt">` — seul format envoyé au navigateur.
  - `groupRegulars(rows: RegularRow[], creatorUserId: string): Regular[]` — clé `u:<userId>`, sinon `e:<email minuscules>`, sinon `n:<prénom normalisé>` uniquement parmi les lignes sans e-mail ; nom = `userName ?? anonName` le plus récent ; tri `outingsTogether` desc puis `lastOutingAt` desc ; créateur exclu. Les clés envoyées au navigateur sont un HMAC court de la clé interne (`createHmac("sha256", process.env.BETTER_AUTH_SECRET)`), pour ne pas exposer `userId`/e-mail.
  - `listRegularRows(creatorUserId: string): Promise<RegularRow[]>` — participants `yes`/`handle_own` des sorties `creatorUserId = …`, non annulées, comptes bannis exclus.

- [ ] **Step 1:** Tests `groupRegulars` : même `userId` sur 3 sorties → 1 entrée, `outingsTogether = 3` ; « Julie » avec e-mail et « Julie » sans e-mail → 2 entrées (Review Focus 2) ; deux « julie » sans e-mail → 1 entrée ; créateur exclu ; tri ; `RegularView` ne contient ni `email` ni `userId` (assertion sur les clés de l'objet).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter `regulars.ts` (+ `toView`, `opaqueKey`) et `listRegularRows`.
- [ ] **Step 4:** Tests + typecheck.
- [ ] **Step 5:** Commit `feat(sortie): liste des habitués d'un organisateur`.

### Task 6: Plan d'ajout / retrait et action « Continuer »

**Files:** Create `src/features/sortie/lib/already-bought/participant-plan.ts`, `participant-plan.test.ts`, `src/features/sortie/actions/who-is-coming-actions.ts`.

**Interfaces:**

- Consumes `Regular`, `groupRegulars`, `listRegularRows` (Task 5).
- Produces:
  - `type RequestedPerson = { key: string; extraAdults: number; extraChildren: number } | { newName: string; newEmail: string | null; extraAdults: number; extraChildren: number }`.
  - `planParticipants(a: { current: CurrentRow[]; creatorParticipantId: string; requested: RequestedPerson[]; regulars: Regular[]; hasPurchase: boolean; newEmailsToday: number }): { ok: true; inserts: NewRow[]; updates: { id: string; extraAdults: number; extraChildren: number }[]; deleteIds: string[] } | { ok: false; message: string; redirectTo?: "dettes" }` — refuse : achat déclaré (`redirectTo: "dettes"`) ; clé inconnue ; > 20 personnes ; > 100 « oui » au total ; > 10 nouvelles adresses dans la sortie ; `newEmailsToday + nouvelles > 20` ; prénom vide (« Il faut un prénom. ») ; e-mail invalide (« E-mail invalide. ») ; doublon de prénom dans la sortie (« Il y a déjà une {Prénom}. Ajoute une initiale : {Prénom} M. ») ; extras hors 0–10. L'organisateur n'est jamais dans `deleteIds` et peut seulement voir ses extras mis à jour.
  - `saveWhoIsComingAction(prev: FormActionState, formData: FormData): Promise<FormActionState>` — `formData.get("payload")` JSON validé par Zod.

- [ ] **Step 1:** Tests `planParticipants` : habitué avec compte → insert `userId` ; habitué sans compte → insert `anonName` + `anonEmail` repris (serveur) ; nouveau prénom + e-mail → insert `anonName`/`anonEmail`, jamais `userId` ; décoché → delete ; organisateur absent de la demande → conservé (Review Focus 4) ; achat déclaré → `redirectTo: "dettes"` (Review Focus 3) ; chaque plafond ; doublon de prénom ; clé inconnue.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter le plan pur. Action : `getSessionUser()` obligatoire ; sortie par `shortId` avec `alreadyBought`, non annulée, `creatorUserId === session.user.id` ; rate-limit `add-participants:${userId}` 10 / 3600 s ; compteur `new-emails:${userId}` (rateLimit 20 / 86400 s, consommé par nouvelle adresse) ; transaction : `SELECT … FOR UPDATE` sur la sortie, revérifier absence d'achat, appliquer le plan (inserts avec `cookieTokenHash` aléatoire comme l'admin, `response: "yes"`), audit `OUTING_PARTICIPANTS_SET_BY_CREATOR` (ids + compteurs, sans adresses) ; puis `redirect` vers `/achat`.
- [ ] **Step 4:** Tests + typecheck.
- [ ] **Step 5:** Commit `feat(sortie): l'organisateur choisit qui vient`.

### Task 7: Page « Qui vient ? » et accès

**Files:** Create `src/app/(sortie)/sortie/[slugOrId]/qui-vient/page.tsx`, `src/features/sortie/components/who-is-coming-form.tsx`, `who-is-coming-form.test.tsx` ; Modify `src/app/(sortie)/sortie/[slugOrId]/page.tsx` (lien), `src/features/sortie/lib/pending-actions.ts` (+ test existant).

**Interfaces:** Consumes `RegularView`, `saveWhoIsComingAction`. Page : non-créateur / non connecté / pas `alreadyBought` → `notFound()` ; achat déclaré → redirect `/dettes`.

- [ ] **Step 1:** Tests composant : état vide → formulaire d'ajout ouvert + texte « Pas encore d'habitués. Ceux qui viennent à tes sorties apparaîtront ici. » ; cocher un habitué met à jour « Continuer · N places → » (Toi + cochés + extras) ; « pas d'e-mail » affiché ; aucune donnée d'e-mail dans le DOM. Test `pending-actions` : sortie `alreadyBought` sans autre participant → « qui vient ? », avec participants → « déclarer l'achat ».
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter selon §5 bis (ossature de `achat/page.tsx`, `Eyebrow tone="hot"` « ─ qui vient ─ », titre « Qui vient ? », aide « Coche ceux qui ont une place. Tu es déjà compté. », lignes `role="checkbox"` ≥ 56 px, `GuestCountStepper`, « + Ajouter quelqu'un », bouton fixe). Lien « Qui vient ? » près de « Déclarer l'achat » (page sortie ~l. 357-366) si `alreadyBought` et pas d'achat. `pending-actions` : libellés ci-dessus.
- [ ] **Step 4:** Tests + typecheck + lint des fichiers touchés.
- [ ] **Step 5:** Commit `feat(sortie): page « Qui vient ? »`.

### Task 8: Option dans le wizard

**Files:** Modify `src/features/sortie/components/create-wizard/index.tsx` (WhenStep ~l. 1595, DeadlineSection ~l. 1809, CommitStep ~l. 2144, brouillon `tryRestoreDraft` ~l. 129-196, payload ~l. 405-440).

**Interfaces:** Consumes `isLoggedIn` existant du wizard ; envoie `alreadyBought=on` dans le FormData.

- [ ] **Step 1:** Test (fichier de test du wizard si présent, sinon `create-wizard/already-bought-option.test.tsx` sur un composant extrait `AlreadyBoughtToggle`) : option visible seulement connecté et un seul créneau ; cochée → section date limite et « + Proposer une autre date » absentes ; libellé « J'ai déjà les billets » et aide exacte.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter : carte-case (style « Me prévenir par email » ~l. 2094-2112) ; `draft.alreadyBought` persisté dans le brouillon ; CommitStep : badge « BILLETS PRIS » et ligne « Personne n'est prévenu pour l'instant. Ensuite : qui vient, puis le prix. » ; ne pas envoyer `rsvpDeadline` quand cochée.
- [ ] **Step 4:** Tests + typecheck + lint du fichier (erreurs préexistantes connues : 5 erreurs / 2 warnings identiques à `main`).
- [ ] **Step 5:** Commit `feat(sortie): option « J'ai déjà les billets » à la création`.

### Task 9: Page achat et e-mail « ta part »

**Files:** Modify `achat/page.tsx`, `purchase-form.tsx`, `src/features/sortie/lib/emails/templates.ts` (purchaseConfirmedEmail) ; Test `templates` (test existant du catalogue si présent, sinon `purchase-confirmed-email.test.ts`).

**Interfaces:** `PurchaseForm` reçoit en plus `countedNames: string[]`, `noEmailNames: string[]`, `hasPaymentMethod: boolean` (calculés côté serveur, aucun e-mail transmis).

- [ ] **Step 1:** Tests : sujet `"{buyer} a pris ta place pour {titre} — {montant}"` ; corps contient « la tienne comprise », « Pour rembourser {buyer} », « Ce n'est pas toi ? Préviens {buyer}. » ; formulaire : prénoms comptés, phrase « Chacun reçoit sa part par e-mail. », « Pas d'e-mail : … Préviens-les toi-même. » si non vide, rappel RIB/Lydia si `hasPaymentMethod` faux.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter les textes exacts du §5 bis.
- [ ] **Step 4:** Tests + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sortie): page achat et e-mail « ta part » plus clairs`.

### Task 10: Vérification finale

- [ ] **Step 1:** `npm test` (seuls les 6 échecs CoList préexistants tolérés), `npm run typecheck`, lint des fichiers touchés.
- [ ] **Step 2:** Relecture finale indépendante de la branche (Review Focus + règles sécurité §5 bis).
- [ ] **Step 3:** Après fusion et publication : vérification en ligne avec l'owner (création d'une vraie sortie « billets déjà pris », page Qui vient, page achat sans valider sauf accord).
