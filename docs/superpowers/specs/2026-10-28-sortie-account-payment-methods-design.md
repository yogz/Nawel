# Sortie — moyens de paiement enregistrés sur le compte

Date : 2026-10-28 · Statut : conception validée par l'owner en chat (« ok »), avant revues
· Périmètre : app Sortie uniquement (FR-only)

## 1. Intention

L'owner veut être remboursé sans friction : « peu importe le moyen, tant que ça arrive sur mon
compte ». Aujourd'hui (vérifié dans le code, 2026-10-28) :

- les moyens de paiement (`purchaser_payment_methods` : Lydia, Revolut, Wero, IBAN) sont
  rattachés à **une participation** (`participant_id`), donc ressaisis à chaque sortie ;
- ils ne peuvent être ajoutés **qu'après** la déclaration d'achat, par l'acheteur
  (`addPaymentMethodAction`, payment-method-actions.ts:73-79) ;
- l'e-mail « ta part » part **à** la déclaration (`purchase-actions.ts:~350`) : il annonce
  donc toujours « Aucun moyen de paiement renseigné pour l'instant » ;
- seul confort actuel : le dernier IBAN / numéro saisi est mémorisé **en clair** dans le
  navigateur (`localStorage`, `sortie:lastPM:<type>`) pour pré-remplir.

Raison probable du « par sortie » (hypothèse, non documentée) : l'app est née « sans compte »,
la seule identité stable d'un acheteur anonyme était sa participation.

## 2. Objectifs

1. Un organisateur **connecté** enregistre ses moyens de paiement **une fois**, sur sa page
   « Mon argent » (`/sortie/moi/argent`) : ajouter, voir (aperçu masqué), retirer.
2. À chaque achat qu'il déclare, ces moyens sont **rattachés automatiquement** à sa
   participation : l'e-mail « ta part » les contient dès l'envoi.
3. Le fonctionnement par sortie reste disponible (ajout/retrait sur `/paiement`), et inchangé
   pour les acheteurs sans compte.

## 3. Non-objectifs

- Pas de nouveau type de moyen de paiement.
- Pas de modification des sorties déjà achetées (pas de rattachement rétroactif).
- Pas de changement de la règle de révélation de l'IBAN complet (`revealIbanAction` : réservée
  au débiteur d'une dette non soldée, journalisée).
- Pas de synchronisation : modifier ses moyens sur le compte ne modifie pas ceux déjà copiés
  sur des sorties passées.

## 4. Anti-objectifs

- Une coordonnée bancaire déchiffrée en dehors de `revealIbanAction`, ou envoyée en clair dans
  un e-mail, un journal ou au navigateur de l'organisateur.
- Quelqu'un qui ajoute ou retire des moyens sur le compte d'un autre.
- Un e-mail « ta part » qui porte les moyens d'une autre personne que l'acheteur.
- Une régression pour les acheteurs sans compte.

## 5. Décisions (owner en chat + choix de conception signalés)

- **Nouvelle table** `sortie.user_payment_methods` _(choix de conception)_ : `id` uuid,
  `user_id` text FK `user.id` (cascade), `type` (enum existant), `value_encrypted`,
  `value_preview`, `display_label`, `created_at` ; index sur `user_id`. Migration additive.
  Même chiffrement que l'existant (`encryptSecret`, AES-256-GCM, clés `SORTIE_IBAN_KEY_*`).
- **Gestion depuis « Mon argent »** : section « Mes moyens de paiement » dans la branche
  connectée de la page, visible même sans dette ni créance. Actions serveur dédiées :
  ajout / retrait, réservées à `session.user` (jamais le seul cookie), mêmes validations que
  l'existant (Zod, `isValidIban`, `sanitizeStrictText` sur le libellé), rate-limit, plafond de
  moyens par compte, audit `USER_PAYMENT_METHOD_ADDED` / `REMOVED` (aperçu seulement).
- **Rattachement à l'achat** _(choix de conception)_ : dans la transaction de
  `declarePurchaseAction`, juste après l'insertion de l'achat, si l'acheteur est le compte
  **connecté** (`session.user.id === me.userId`), copier ses lignes `user_payment_methods`
  dans `purchaser_payment_methods` pour `participant_id = me.id` — chiffré tel quel, **sans
  déchiffrer**. L'e-mail existant (`fetchMethodsFor`) les inclut alors sans autre changement.
  Audit `PAYMENT_METHODS_COPIED_FROM_ACCOUNT` (nombre, types).
- **Page achat** : le texte ajouté par le chantier précédent devient conditionnel — avec des
  moyens enregistrés : « Tes moyens de paiement seront joints au mail de chacun » + leurs
  aperçus ; sans : « Ajoute-les une fois dans Mon argent : ils seront joints au mail de
  chacun. » (lien vers `/moi/argent`).
- **Révélation inchangée** : seul le débiteur voit l'IBAN complet, via `revealIbanAction`.

## 6. Mesure de réussite

- Ajouter / retirer un moyen sur son compte, et refus pour un visiteur non connecté (tests des
  règles pures + typecheck des actions).
- Déclarer un achat en étant connecté copie les moyens du compte, et l'e-mail « ta part » les
  liste (test du plan de copie + test du gabarit existant).
- Acheteur sans compte : comportement identique à aujourd'hui.
- Vérification en ligne avec l'owner : enregistrer ses moyens, déclarer un achat de test (avec
  son accord) et lire l'e-mail reçu.

## 7. Laissé aux revues puis au constructeur

- Revue sécurité (obligatoire, coordonnées bancaires) : autorisations, copie du chiffré,
  plafonds, journalisation, sort du cache `localStorage` en clair, step-up éventuel.
- Revue UX / rédaction : section « Mes moyens de paiement » de « Mon argent », texte de la
  page achat, éventuelle proposition « enregistrer aussi sur mon compte » sur `/paiement`.
- Découpage du code et des fichiers.
