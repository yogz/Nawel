# Sortie — le profil montre les sorties où je vais

Date : 2026-10-28 · Statut : conception validée par l'owner en chat (« ok »), après relecture builder · Périmètre : app
Sortie uniquement (FR-only), page `/@<username>` et son aperçu de partage.

## 1. Intention

Aujourd'hui le profil `/@<username>` ne liste que les sorties **créées** par la personne
(`listPublicProfileOutings` : `creatorUserId = user`, `showOnProfile = true`, non annulées). Une
sortie organisée par quelqu'un d'autre où l'owner a dit oui n'apparaît nulle part sur son profil.

L'owner veut que son profil reflète **ce qu'il va voir**, qu'il en soit l'organisateur ou non, et
séparer nettement deux usages de la même page :

- **Profil public** (`/@nicolas`, sans clé) : une vitrine de goûts. On voit les sorties, rien de
  plus. Personne ne peut agir depuis là.
- **Lien privé** (`/@nicolas?k=<token>`) et **suiveurs** (mode « inbox » existant,
  `inboxMode = tokenValid || viewerFollows`) : tout le détail + répondre directement à **ses**
  sorties ; les sorties des autres où il va y sont visibles, mais sans possibilité de répondre.

## 2. Objectifs

1. **Liste élargie** (les deux modes) : sorties créées par l'utilisateur (règle actuelle) **plus**
   les sorties créées par d'autres où l'utilisateur est participant avec la réponse `yes` ou
   `handle_own` (« je prends ma place moi-même » = il y va aussi).
2. **Profil public dépouillé** : chaque sortie n'affiche que **l'image, le titre et la salle**.
   Pas de date, pas de compte à rebours/deadline, pas de nombre de participants, pas de votes,
   pas de lien cliquable. Valable pour **toutes** les sorties du profil public, y compris celles
   de l'owner (décision explicite de l'owner : « profil public = juste la liste des sorties où je
   vais, on affiche image, titre, salle et voilà »).
3. **Lien privé / suiveurs** : comportement actuel conservé pour **ses** sorties (date, salle,
   cartes cliquables, réponse inline). Les sorties des autres où il va y apparaissent avec date
   et salle, mais **sans réponse inline ni lien vers la sortie** : personne ne s'ajoute à la
   liste d'un autre organisateur sans y avoir été invité par lui (décision owner, cf. §5 bis).
4. **Aperçu de partage** (`generateMetadata` description + `opengraph-image.tsx`) : plus aucune
   date, pour rester cohérent avec le profil public. Le compteur « N sorties à venir » du titre
   peut rester (il ne révèle rien de plus que la liste).

## 3. Non-objectifs

- Pas de changement du **fil des suiveurs** ni de l'e-mail « nouvelle sortie » aux abonnés : ils
  restent basés sur les sorties créées par l'utilisateur.
- Pas de réglage par sortie « montrer / cacher de mon profil » pour les sorties des autres (pas
  demandé ; voir §6 si besoin plus tard).
- Pas de changement de la page d'une sortie (`/<slug>-<shortId>`), qui reste accessible par son
  lien et affiche toujours sa date.
- Pas de changement de schéma DB attendu.

## 4. Anti-objectifs (échec même si « ça marche »)

- Permettre à un visiteur du profil (public, lien privé ou suiveur) de s'inscrire à la sortie
  d'un autre organisateur depuis ce profil, ou d'y accéder par un lien.
- Laisser un visiteur du profil public atteindre une sortie (lien, bouton partager une sortie,
  etc.) ou déduire sa date.
- Afficher une sortie où l'owner a répondu `no` ou seulement voté `interested` dans un sondage
  non tranché.

## 5. Règles décidées

| Point                                                        | Décision                                                                                                              | Source                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Sorties des autres incluses                                  | réponse `yes` ou `handle_own` de l'utilisateur                                                                        | owner (« où je vais ») ; inclusion de `handle_own` = choix de Claude |
| Filtre sur les sorties d'autrui                              | non annulée ; filtre `showOnProfile = true` conservé par cohérence, mais **il ne protège rien** (cf. §5 bis)          | constat de la relecture                                              |
| Sorties d'autrui, lien privé / suiveurs                      | date + salle affichées, **pas de réponse inline, pas de lien**                                                        | owner (« ok » à la reco, §5 bis)                                     |
| Contenu public                                               | image (ou poster de repli existant), titre, salle                                                                     | owner                                                                |
| Cliquable en public                                          | non                                                                                                                   | owner                                                                |
| Hero « prochaine sortie » (`LiveStatusHero`) en public       | supprimé (n'a plus de sens sans date ni clic)                                                                         | choix de Claude, présenté, non contredit                             |
| Rangée « récemment ajoutées » (`RecentlyAddedRow`) en public | supprimée (badge « ajouté il y a… » + cliquable)                                                                      | choix de Claude                                                      |
| Bio en public                                                | conservée telle quelle                                                                                                | choix de Claude (inchangé)                                           |
| Bouton « partager mon profil » en public                     | conservé (partage le profil, pas une sortie)                                                                          | choix de Claude (inchangé)                                           |
| Section « passées » en public                                | conservée, même format dépouillé                                                                                      | choix de Claude                                                      |
| Ordre en public                                              | à venir puis passées ; à l'intérieur, ordre chronologique comme aujourd'hui (la date sert au tri, sans être affichée) | choix de Claude                                                      |
| L'owner sur son propre profil sans clé                       | voit la version publique (utile pour vérifier ce que voient les autres)                                               | inchangé                                                             |
| Lien privé : mention « organisé par »                        | petite mention « organisé par @x » (ou prénom) sur les sorties d'autrui                                               | choix de Claude, forme laissée au builder                            |

## 5 bis. Pourquoi pas de réponse aux sorties d'autrui

Vérifié dans le code (2026-10-28) : `showOnProfile` vaut toujours `true` à la création (wizard
`create-wizard/index.tsx:472`, défaut Zod `schemas.ts:142`) et aucun écran ne permet de le
changer. Un organisateur n'a donc aucun moyen de refuser que sa sortie apparaisse sur le profil
d'un participant. Plutôt que d'ajouter ce réglage (travail en plus pour un cas rare : l'owner crée
quasiment toutes les sorties), on rend l'affichage des sorties d'autrui **inerte partout** : la
vitrine publique ne montre que image/titre/salle, le lien privé ajoute la date mais aucun moyen
de s'inscrire. `rsvpAction` ne vérifie pas d'où vient le visiteur : la garantie doit donc venir
du rendu (aucun formulaire, aucun lien) — la page de la sortie reste joignable par qui en a déjà
le lien, comme aujourd'hui.

Réglage par organisateur (« ma sortie peut apparaître sur le profil des participants ») :
écarté pour l'instant, à rouvrir si d'autres organisateurs deviennent actifs.

## 6. Laissé au builder

- Forme de la requête : élargir `listPublicProfileOutings` (union créateur / participant `yes` |
  `handle_own`, dédoublonnée) ou une requête sœur. Garder la limite actuelle (50) et `cache()`.
  Vérifier les index (`sortie_participants` sur `user_id`).
- Rendu public : variante « vitrine » de `OutingProfileCard` (prop) ou petit composant dédié ;
  le plus simple qui ne duplique pas la logique d'image/poster/salle (`formatVenue`,
  `OutingPosterFallback`).
- Distinction visuelle « organisé par » en mode lien privé.
- Tests co-localisés : la règle d'inclusion (yes/handle_own/no/interested, annulée,
  dédoublonnage — le créateur a déjà une row participant `yes`), l'absence de date/lien en mode
  public, l'absence de réponse/lien sur les sorties d'autrui en mode lien privé. Ne pas envoyer
  les dates au navigateur en mode public (les retirer des props, pas seulement de l'affichage).
- Vérification réelle en local (`curl` avec `Host: sortie.colist.fr`, cf. mémoire « Tester
  Sortie en local »).

## 7. Conséquence acceptée

Un visiteur du profil public ne peut plus rejoindre une sortie de l'owner depuis le profil : il
faut lui envoyer le lien privé ou le lien de la sortie. L'owner l'a lu et validé (« ok »).
