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

## 5 bis. Arbitrages après les revues (2026-10-28)

Trois revues (sécurité, UX/rédaction, « constructeur »). Vérifié dans le code : inscription par
mot de passe ouverte avec `requireEmailVerification: false` (`auth-config.ts:127-130`) ;
rattachement par e-mail à la connexion qui pose `userId` sans retirer le cookie
(`auth-config.ts:~609-623`) ; `decryptSecret` retrouve la clé par `keyId` (copie du chiffré
sans déchiffrer = sûre). Ces choix **remplacent** le §5 quand ils divergent ; tous sont des
_choix de conception_.

**Compte « pré-créé » par un attaquant (sécurité C1).**

- Gérer des moyens sur le compte exige `session.user.emailVerified === true`.
- Chaque **ajout** reste « en attente » jusqu'au clic sur un lien envoyé à l'adresse du compte
  (jeton à usage unique, 15 min, haché en base). Un mot de passe volé ou planté ne suffit donc
  pas : il faut aussi la boîte mail.
- E-mail de notification à chaque ajout confirmé et à chaque retrait.

**Condition de copie (sécurité C2).** Fonction pure `mayCopyAccountMethods` :
`sessionUserId !== null && buyer.userId === sessionUserId` — jamais `buyer.userId` seul, jamais
le cookie. Réutilisée par le texte de la page achat (jamais d'annonce d'une copie qui ne part
pas). Couvre aussi le cas « inscription créée sans compte puis connexion » : pas de copie.

**Geste conscient (sécurité I2).** Sur la page achat, les moyens du compte sont listés avec une
case à cocher chacun (cochées par défaut). Le serveur ne copie que les identifiants cochés,
après avoir revérifié qu'ils appartiennent au compte connecté et sont confirmés.

**Faiblesse existante resserrée (sécurité I1).** Ajout / retrait de moyens **par sortie** : si
la ligne participant porte un `userId`, exiger `session.user.id === row.userId` (le cookie seul
ne suffit plus).

**Cache navigateur en clair (sécurité I4).** Supprimé : plus d'écriture `sortie:lastPM:*`, purge
des valeurs existantes au chargement du gestionnaire. Le stockage sur le compte remplace ce
confort.

**Libellé (sécurité M2).** 40 caractères max, refus d'une suite de plus de 8 chiffres (évite
« vire plutôt sur FR76… » dans les e-mails des autres).

**Plafonds et audit (sécurité M3).** 5 moyens confirmés max par compte ; rate-limit
`acct-pm:<userId>` 10 / h ; doublon refusé (même type + même aperçu) : « Tu as déjà un IBAN qui
finit par 1234. » Audit `USER_PAYMENT_METHOD_ADDED` / `CONFIRMED` / `REMOVED`
(`{methodId, type, valuePreview}`, `outing_id` nul) et `PAYMENT_METHODS_COPIED_FROM_ACCOUNT`
(`{purchaseId, count, types, sourceMethodIds}`) dans la transaction d'achat. Noms figés en
constantes.

**Rotation des clés (sécurité I3).** Avant de retirer une ancienne clé `SORTIE_IBAN_KEY_*`, un
rechiffrement doit couvrir les deux tables (`purchaser_payment_methods` et
`user_payment_methods`). Note ajoutée au commentaire de `crypto.ts`.

**Écrans et textes (revue UX).**

- « Tes moyens de paiement » en bas de « Mon argent » (`id="moyens"`), visible même sans
  dette ; aide : « Enregistre-les une fois : ils sont joints automatiquement au mail de chacun
  quand tu déclares un achat. » / « Masqués partout. En entier seulement pour qui te doit de
  l'argent, à sa demande. » ; état vide avec formulaire ouvert ; sinon « + Ajouter un autre
  moyen » ; retrait en deux temps (« Oui, retirer » / « Annuler »), bouton ≥ 44 px avec
  `aria-label` précis ; aide sous le libellé « Visible par ceux qui te remboursent. » ;
  messages : « IBAN ajouté : confirme-le depuis le mail qu'on vient de t'envoyer. »,
  « Retiré de ton compte. Les sorties déjà achetées gardent l'ancien. », « 5 moyens maximum.
  Retire-en un pour en ajouter un autre. »
- Page achat : connecté avec moyens → « Chacun reçoit sa part par e-mail, avec tes moyens de
  paiement : » + cases ; connecté sans moyen → « … Ajoute ton IBAN ou ton Lydia une fois dans
  Mon argent ↗ » (nouvel onglet, `/moi/argent#moyens`) ; sinon texte actuel (« RIB » → « IBAN »).
- `/paiement` : pas d'« enregistrer aussi sur mon compte » ; phrase « Ce que tu ajoutes ici ne
  vaut que pour cette sortie. Pour ne plus le ressaisir : Mon argent ↗. » et refus des doublons
  (« Déjà ajouté pour cette sortie. »).
- E-mail : après la liste « Numéros masqués ici : « Régler ma part » les affiche en entier. » ;
  cas vide : « {Prénom} n'a pas encore indiqué comment le rembourser. Ça apparaîtra sur ta page
  dès que c'est fait. »

**Vérification en ligne (revue « constructeur »).** Pas de vrai achat (une déclaration est
définitive et la base locale est la prod) : l'owner enregistre ses moyens dans « Mon argent » et
confirme par e-mail ; le rendu de l'e-mail est vérifié via l'aperçu admin des e-mails.

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
