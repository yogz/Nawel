# Sortie — créer une sortie « billets déjà pris »

Date : 2026-10-28 · Statut : conception validée par l'owner en chat (« c'est bon »), avant revues
· Périmètre : app Sortie uniquement (FR-only)

## 1. Intention

L'owner (seul créateur actif : 9/9 sorties sur 90 j) crée souvent une sortie **après** avoir
acheté les billets, en sachant déjà qui vient. Il veut que la sortie existe dans l'app (page,
agendas, rappel J-1, remboursements) sans rien demander à personne.

Aujourd'hui (vérifié dans le code, 2026-10-28) :

1. L'étape « date limite de réponse » s'affiche dans le wizard (facultative techniquement —
   `resolveDeadline` la dérive — mais perçue comme obligatoire). Pour une sortie proche, la
   date dérivée peut être déjà passée : le sweeper bascule la sortie et envoie un e-mail
   « réponses closes » inutile.
2. L'e-mail « nouvelle sortie » (`sendNewOutingBroadcast`) part à tous les abonnés à la
   création, sans tenir compte du fait qu'il n'y a plus de place.
3. Aucun moyen pour l'organisateur d'ajouter des participants ; seul l'admin le peut, et
   seulement pour des comptes existants (pas Cécile, participante sans compte).

## 2. Objectifs

1. Une option « **Billets déjà pris** » à la création (sorties à date fixe uniquement).
2. Avec cette option : pas d'étape date limite, réponses fermées d'office, **aucun e-mail
   « nouvelle sortie »** aux abonnés, aucun e-mail « réponses closes ».
3. Une page « **Qui vient ?** » réservée à l'organisateur : il coche ses **habitués** (personnes
   déjà venues à ses sorties, avec ou sans compte), ajoute un nouveau par son prénom (e-mail
   facultatif), et indique les +1 (adultes / enfants).
4. Puis la page **achat existante** : déclaration du prix (unique / adulte-enfant / par place),
   calcul des dettes existant, et l'e-mail existant « ta part » aux participants qui ont une
   adresse e-mail (décision owner : oui, un e-mail).

## 3. Non-objectifs

- Pas de sondage (mode vote) « billets déjà pris » : la date est connue par définition.
- Pas de modification du calcul des dettes, des modes de prix ni des e-mails d'argent
  existants (hors ajustement de texte décidé par la revue copywriting, §7).
- Pas d'ajout de participants **après** la déclaration d'achat (recalcul des dettes hors
  périmètre) : la page « Qui vient ? » n'est disponible qu'avant l'achat.
- Une seule migration additive (colonne booléenne, cf. §5) ; rien d'autre au schéma.
- Pas de changement pour les sorties créées normalement.

## 4. Anti-objectifs

- Un abonné qui reçoit « nouvelle sortie » pour une sortie complète.
- Un participant ajouté qui reçoit plusieurs e-mails (ajout + réponses closes + achat) :
  **un seul e-mail**, celui de l'achat avec sa part.
- Un organisateur qui peut ajouter des participants à la sortie de quelqu'un d'autre, ou
  exposer les e-mails de ses habitués côté navigateur.
- Une régression sur l'argent : dettes fausses, achat déclarable par quelqu'un d'autre.

## 5. Décisions (owner en chat + choix de conception signalés)

- **Parcours en 3 temps** _(choix de conception)_ : wizard (option cochée) → page
  « Qui vient ? » → page `/achat` existante → page `/dettes` existante. Raison : réutiliser
  tel quel tout le code d'argent (déclaration, dettes, e-mail « ta part ») plutôt que de le
  dupliquer dans le wizard — c'est la partie la plus sensible.
- **État de la sortie à la création** _(choix de conception)_ : créée directement avec
  `status = "awaiting_purchase"` et `deadlineAt = maintenant`. Effets : le sweeper (qui ne
  traite que `open`) ne l'ouvre ni ne la ferme, donc pas d'e-mail « réponses closes » ;
  `rsvpAction` refuse déjà les réponses quand la deadline est passée et le statut ≠ `open` ;
  la déclaration d'achat est déjà autorisée sur ce statut. Pas de nouvelle colonne.
- **Pas d'e-mail aux abonnés** : `sendNewOutingBroadcast` n'est pas appelé quand l'option est
  cochée. La sortie reste visible sur le profil public (comportement normal de `showOnProfile`).
- **Organisateur = participant « oui »** : déjà le cas en mode fixe à la création ; il pourra
  donc déclarer l'achat (règle existante : un confirmé).
- **Habitués** : personnes distinctes ayant été participantes (réponse `yes` ou `handle_own`)
  aux sorties créées par l'organisateur, hors lui-même ; une personne = un compte (`userId`)
  ou, sans compte, un prénom (`anonName`, comparaison insensible à la casse et aux accents).
  Triées par nombre de sorties partagées puis récence. **Le navigateur ne reçoit que des
  prénoms et un indicateur « a un e-mail »** — jamais les adresses.
- **Ajout d'un participant par l'organisateur** : ligne `participants` avec `response = "yes"`,
  extras adultes/enfants, `cookieTokenHash` aléatoire (même technique que l'admin :
  ne correspondra jamais à un vrai cookie). Pour un habitué avec compte : `userId`. Sans
  compte : `anonName` (+ `anonEmail` repris de sa dernière participation, côté serveur
  uniquement, ou saisi pour un nouveau).
- **E-mail** : l'e-mail existant envoyé à la déclaration d'achat (`purchaseConfirmedEmail`,
  une ligne par débiteur ayant un e-mail) est le seul envoi. Les participants sans e-mail
  sont prévenus par l'organisateur.
- **Sécurité** : action réservée au créateur (`isOutingOwner`), uniquement sur une sortie
  « billets déjà pris » sans achat déclaré, non annulée ; rate-limit ; `sanitizeStrictText` sur
  les prénoms ; validation Zod ; plafond du nombre de participants ajoutés par appel.
  **Revue sécurité obligatoire avant code** (règle projet : argent / identité).

## 5 bis. Arbitrages après les revues (2026-10-28)

Trois revues en parallèle (UI/UX/DA/copywriting, sécurité, « constructeur »). Affirmations clés
vérifiées dans le code : réutilisation d'un compte silencieux non vérifié à la création
(`canReuseExistingSilentUser`, `outing-actions.ts:122-176`) et rattachement automatique des
lignes `anonEmail` à la connexion (`auth-config.ts:~620`). Les choix ci-dessous **remplacent**
ceux du §5 quand ils divergent ; tous sont des _choix de conception_ sauf mention.

**Marqueur en base.** Colonne `outings.already_bought boolean not null default false`
(migration additive, versionnée). Sans elle, aucune règle serveur ne distingue ces sorties d'une
sortie normale arrivée en `awaiting_purchase`. _Remplace_ « pas de nouvelle colonne ».

**Qui peut utiliser la fonctionnalité (sécurité C1).** Uniquement un utilisateur **réellement
connecté** (`session.user`) : l'option est masquée et refusée côté serveur pour un créateur
anonyme ou par e-mail seul. Toutes les vérifications comparent `outing.creatorUserId` à
`session.user.id` — jamais `isOutingOwner` (cookie) pour ces actions.

**Création.** Mode date fixe uniquement, `startsAt` présent et **dans le futur**. Statut
`awaiting_purchase`, `deadlineAt = now`, `already_bought = true`, pas d'appel à
`sendNewOutingBroadcast`. Après publication : redirection vers `/{slug}/qui-vient`.

**Réponses fermées pour de bon (sécurité I5).** `rsvpAction` et `castVoteAction` refusent si
`already_bought`. Le formulaire de modification masque la date limite pour ces sorties (valeur
inchangée) et n'envoie pas d'e-mail « sortie modifiée » tant qu'aucun achat n'est déclaré.

**Achat réservé à l'organisateur (sécurité I6).** Sur une sortie `already_bought`,
`declarePurchaseAction` et la page `/achat` exigent `session.user.id === creatorUserId`. Seule
modification du code d'argent ; rien d'autre n'y change.

**Identité choisie par le serveur (sécurité I1, I2, I3).**

- Habitués calculés côté serveur depuis les sorties créées par `session.user.id` (réponses
  `yes` / `handle_own`, comptes bannis exclus). Regroupement : par `userId` ; sinon par e-mail
  en minuscules ; sinon par prénom **uniquement parmi les lignes sans e-mail**. Jamais de fusion
  entre une ligne avec e-mail et une sans.
- Le navigateur ne reçoit que : clé opaque, prénom, « a un e-mail » (oui/non), nombre de sorties
  ensemble et dernière sortie commune (pour distinguer deux homonymes). Jamais d'adresse ni de
  `userId`. L'action ne reçoit que des clés ; le serveur recalcule la liste et refuse toute clé
  inconnue.
- Nouvelle personne : `anonName` (`sanitizeStrictText`, 100) + `anonEmail` facultatif (Zod
  `.email()`, minuscules, 255). **Jamais** de compte silencieux ni de `userId` posé depuis un
  e-mail saisi.
- Journal d'audit « participants ajoutés par l'organisateur » (identifiants, sans adresses).

**Liste remplacée, pas ajoutée.** « Continuer » envoie la liste complète ; décocher retire la
personne. Transaction avec verrou sur la sortie (`FOR UPDATE`) qui revérifie : pas d'achat, pas
annulée, `already_bought`. Doublons refusés (même clé, même `userId`, même e-mail, ou même
prénom dans la sortie → « Ajoute une initiale »). L'organisateur reste toujours inscrit.

**Plafonds (sécurité I4).** ≤ 20 personnes par appel ; ≤ 100 participants « oui » par sortie ;
≤ 10 nouvelles adresses par sortie et ≤ 20 par organisateur sur 24 h ; action ≤ 10 appels/h
(`add-participants:${userId}`) ; ≤ 5 créations « billets déjà pris » par organisateur et par jour.

**Écrans et textes (revue UX).**

- Wizard, étape « C'est quand ? », à la place de la section date limite (connecté, un seul
  créneau) : carte-case **« J'ai déjà les billets »**, aide « Personne n'est invité à répondre.
  Tu indiques qui vient, puis le prix. » Cochée : date limite et « proposer une autre date »
  masquées ; choix sauvegardé dans le brouillon local. Étape finale : badge « BILLETS PRIS »,
  ligne « Personne n'est prévenu pour l'instant. Ensuite : qui vient, puis le prix. »
- Page « Qui vient ? » (`/{slug}/qui-vient`) : même ossature que `/achat` ; « Toi » toujours
  compté avec ses +1 ; habitués en lignes cochables (≥ 56 px, `role="checkbox"`), avec « N sorties
  ensemble » et l'étiquette « pas d'e-mail » ; « + Ajouter quelqu'un » (prénom, e-mail facultatif
  « Pour qu'il reçoive sa part. ») ; état vide avec formulaire ouvert ; bouton fixe
  « Continuer · N places → » vers `/achat`. Si l'achat est déjà déclaré : renvoi vers `/dettes`.
  Lien « Qui vient ? » sur la page de la sortie tant que l'achat n'est pas déclaré.
- Page `/achat` (utile aux deux parcours) : prénoms comptés sous « Places à couvrir » ; « Chacun
  reçoit sa part par e-mail. » + « Pas d'e-mail : X, Y. Préviens-les toi-même. » ; si aucun moyen
  de paiement : « Ajoute un RIB ou un Lydia : il apparaîtra dans le mail de chacun. »
- E-mail d'achat (une version pour les deux parcours) : objet « {Prénom} a pris ta place pour
  {titre} — {montant} », paragraphe « … a pris les places pour {titre} le {date}, la tienne
  comprise. Ta part : {montant}. », intertitre « Pour rembourser {Prénom} », note « Pour te
  reconnaître, la page te demandera ton e-mail : donne celui où tu reçois ce message. » et
  « Ce n'est pas toi ? Préviens {Prénom}. »
- Liste « à faire » : « qui vient ? » puis « déclarer l'achat » pour ces sorties, au lieu de
  « acheter les tickets ».

**Écartés (mineurs, assumés).** Rappel J-1 qui peut partir avant l'e-mail d'achat si l'achat
n'est pas déclaré la veille ; visibilité des prénoms pour qui a le lien (même règle que les
sorties normales) ; pas de recours de contestation d'une dette (inexistant aujourd'hui).

## 6. Mesure de réussite

- Créer une sortie « billets déjà pris » ne déclenche ni e-mail aux abonnés ni e-mail
  « réponses closes » (test).
- L'organisateur ajoute un habitué avec compte, un habitué sans compte et un nouveau prénom ;
  la page achat calcule les parts de chacun, extras compris (tests de l'action + de la requête
  habitués).
- Un autre utilisateur ne peut pas ajouter de participants ni voir la liste des habitués
  (tests d'autorisation).
- Vérification finale dans l'app en ligne, sur une vraie sortie de l'owner, sans déclarer
  d'achat réel (ou avec son accord).

## 7. Laissé aux revues puis au constructeur

- Revue UI / UX / direction artistique / copywriting (design system « Acid Cabinet »,
  `DESIGN_SYSTEM.md`) : place et libellé de l'option dans le wizard, écran « Qui vient ? »,
  enchaînement vers l'achat, texte de l'e-mail « ta part » dans ce contexte.
- Revue sécurité : autorisations, exposition des e-mails, abus possibles.
- Découpage du code, nom des fichiers, détail des requêtes.
