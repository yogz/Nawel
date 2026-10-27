# Sortie — qualité de la récupération depuis un lien (image, salle, heure)

Date : 2026-10-27 · Statut : conception, à valider par l'owner · Périmètre : app Sortie uniquement

## 1. Intention

Quand on crée une sortie, on colle le lien d'un spectacle (site de la salle ou billetterie).
L'app doit en tirer **l'affiche, la salle et l'heure sans que l'organisateur ait à y toucher**.
L'owner l'a dit explicitement : il préfère que ça « marche sans y toucher » plutôt que de
choisir parmi des propositions.

Pourquoi maintenant : l'owner est aujourd'hui le seul créateur (9/9 sorties sur 90 j) et c'est
le point qui l'agace le plus à la création. Chaque sortie partagée sans vraie affiche est moins
attirante (page sortie + aperçu de lien).

## 2. État mesuré (2026-10-27, données réelles)

Mesures faites en lecture seule sur les 43 sorties non annulées (38 ont un lien).

**Image** — 19/43 images ont été envoyées à la main (hébergées sur notre Blob ; seule
l'upload manuel y écrit le hero). Sur les 14 sorties « image manuelle » qui ont un lien :

| Cause                                                                         | Cas | Hosts                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La page n'expose aucune image (pas d'`og:image`, page rendue en JS, anti-bot) | 6   | tickets.rivajgroup.com, billetterie.theatremarigny.fr, s.pathe.fr, sohoplace.org, sallepleyel.com, shotgun.live                                                                   |
| La page expose une image **générique du site**, prise pour l'affiche          | 5   | olympiahall.com (logo PNG), theatredeloeuvre.com (logo SVG), adidasarena.com (`/seo.jpg`), parisladefense-arena.com (photo de foule commune), web.digitick.com (vignette 110×110) |
| La bonne affiche est exposée, remplacée quand même                            | 2   | billetreduc.com — **inexpliqué** (l'image se charge, parse_stats dit image trouvée ; probable panne passagère, à surveiller)                                                      |
| Autre / page disparue (404)                                                   | 1   | —                                                                                                                                                                                 |

La télémétrie actuelle (`parse_stats.image_found`) compte un logo comme une image trouvée :
elle surestime la réussite.

**Salle** — sur le site d'une salle, la page ne nomme pas sa propre salle comme lieu de
l'événement. Le nom est presque toujours dans `og:site_name` (« Salle Pleyel », « Théâtre
Montparnasse », « Zénith Paris - La Villette »…). Quand JSON-LD `location.name` existe, il est
parfois inutilisable : nom de salle interne (« Grande Salle » au Châtelet) ou adresse
(« 17 Avenue du Général… » au Grand Palais). Aujourd'hui `og:site_name` n'est retenu que s'il
« ressemble à une salle » (`looksLikeVenue`) ou suffixe le titre.

**Heure** — point le plus faible. JSON-LD donne souvent la date **sans heure**
(`startDate: "2026-06-18"` au Châtelet, au Grand Palais). L'heure n'est alors que dans le
texte (« 20h00 », « 21h30 »), mélangée à d'autres heures (ouverture, billetterie).

Mesures faites depuis le Mac de l'owner, pas depuis Vercel (iad1, IP datacenter US) : certains
sites peuvent répondre différemment aux serveurs.

## 3. Objectifs

1. **Image** : sur le jeu de référence (§7), au moins **9 des 14 cas « image manuelle »**
   obtiennent automatiquement la bonne affiche, **sans régression** sur les 24 cas qui
   marchent déjà.
2. **Zéro faux positif connu** : les 5 images génériques identifiées ne sont plus jamais
   retenues comme affiche.
3. **Salle** : le vrai nom de la salle est rempli sur les sites de salles du jeu de référence
   (pas « Grande Salle », pas une adresse, pas « accorarena » en minuscules).
4. **Heure** : remplie quand la page la donne de façon non ambiguë.
5. **Télémétrie honnête** : une image générique rejetée ne compte pas comme image trouvée.
   _(Choix de conception : version minimale, sans migration ni nouvelle colonne — la base
   locale est la base de production.)_

## 4. Non-objectifs

- Pas de navigateur headless côté serveur pour lire les sites rendus en JS (lourd, souvent
  payant). La recherche par le nom couvre ces cas.
- Pas de changement de l'interface du wizard (pas d'écran « choisis parmi N images »).
  Le panneau de secours actuel (`MissingImagePicker`) reste tel quel, en dernier recours.
- Pas de choix de la date parmi les représentations multiples : l'utilisateur choisit déjà
  la date ; on vise l'heure.
- Pas de nouveau service payant.

## 5. Anti-objectifs (échecs même si « ça marche »)

- **Une image d'un autre spectacle est pire que pas d'image.** Une image trouvée par recherche
  (Ticketmaster, Gemini) n'est retenue que si le titre correspond et, quand une date est
  connue, la date aussi.
- Un logo ou une image de site retenu comme affiche.
- Une création plus lente qu'aujourd'hui dans le pire cas : 5 s de fetch de la page + 5 s
  d'appel Ticketmaster au maximum, pas d'étape supplémentaire bloquante.
- Une heure fausse remplie avec assurance : mieux vaut vide que fausse.

## 6. Décisions déjà prises (owner + conception)

- **Automatique d'abord**, l'utilisateur ne choisit pas (décision owner).
- **Ordre de recherche de l'image** :
  1. image de l'événement dans JSON-LD (`image`, aujourd'hui ignoré par `extractJsonLd`) ;
  2. `og:image` / `twitter:image`, **si non générique** ;
  3. recherche par le nom via Ticketmaster Discovery (déjà intégré, gratuit), **étendue à tous
     les hosts** quand la page n'a pas donné d'image valable, avec contrôle titre (+ date si
     connue) ;
  4. sinon, rien → panneau de secours actuel.
- **Gemini hors de ce chantier** _(choix de conception)_ : `findEventDetails` met 12-15 s
  (timeouts 25 s + 20 s), passe par une route séparée (`/api/sortie/find-event`) avec son cache
  7 j, son quota et une carte que l'utilisateur doit accepter. L'intégrer au parse casserait le
  budget de temps ; l'appliquer automatiquement changerait le wizard. On mesure d'abord sans
  Gemini (§7) ; si l'objectif image n'est pas atteint, l'owner décide d'une phase 2.
- **Enrichissement Ticketmaster existant inchangé** _(choix de conception)_ : pour ticketmaster.fr
  et les hosts CTS Eventim, le comportement actuel (premier résultat, keyword du slug) est
  conservé tel quel pour ne pas régresser ; c'est la seule source sur ces sites. Le contrôle
  titre (+ date) s'applique à la **nouvelle** recherche par le nom (hosts de salles).
- **Un résultat de recherche validé ne remplit que les champs vides** _(choix de conception)_ :
  image, et aussi salle / heure si la page ne les a pas données. Jamais d'écrasement d'une
  donnée issue de la page.
- **Image générique** = au minimum : SVG ; nom de fichier contenant `logo`, `seo`,
  `default`, `share`, `placeholder` ; dimension connue < 400 px de côté. Les 5 cas du §2
  doivent être rejetés.
- **Salle** : sur une page dont le JSON-LD `location.name` est absent, interne
  (« Grande Salle », « Salle 1 »…) ou ressemble à une adresse, on préfère `og:site_name`
  quand la page appartient au site de la salle.
- **Heure** : JSON-LD `startDate` si elle porte une heure ; sinon une heure trouvée **à
  proximité de la date** dans la description ou le texte ; sinon vide.
- **Bug existant à corriger** _(vérifié dans le code)_ : quand la page donne une date sans heure
  (`startDate: "2026-06-18"`), le wizard fait `new Date(...)` puis `getHours()` et pré-remplit
  « 02:00 » (minuit UTC vu de Paris en été) — une heure fausse affichée avec assurance. La
  réponse du parse doit distinguer « date seule » de « date + heure », et le wizard ne doit
  pré-remplir l'heure que si elle est connue. _(Choix de conception : « pas de changement de
  l'interface du wizard » vise l'écran ; modifier cette logique de lecture est autorisé.)_
- **Coûts** : rester dans les offres gratuites (Ticketmaster Discovery gratuit ; Gemini appelé
  seulement en dernier recours, volume actuel ~10 créations/mois).
- **Sécurité** : tout fetch externe passe par `safeFetchExternal` (protection SSRF existante),
  y compris d'éventuels fetchs d'image pour mesurer leur taille.
- **Sortie FR-only** : messages en français en dur, pas d'i18n.

## 7. Mesure de réussite : jeu de référence

- **Source** _(choix de conception)_ : le constructeur lit lui-même, en lecture seule, les liens
  des sorties en base (comme pour les mesures du §2) et sauvegarde le HTML des pages depuis le
  Mac en fixtures.
- **Résultats attendus** _(choix de conception)_ : fixés par le constructeur, en comparant
  visuellement l'image trouvée à l'image finalement publiée (méthode déjà utilisée pour Pilote,
  où l'image manuelle était la même affiche). Les cas douteux sont notés « à confirmer par
  l'owner » dans le rapport, avec les images côte à côte.
- Le jeu contient, pour chaque lien : image attendue (ou « générique à rejeter » / « aucune
  attendue »), salle attendue, heure attendue si la page la donne.
- Raison : la base locale **est** la base de production, et le parser écrit dans
  `parse_stats` ; aucun test ne doit appeler la route réelle ni la base.
- Les tests automatiques simulent les réponses Ticketmaster (une simulation réussit par
  construction : elle teste la logique, pas le taux de réussite).
- **Mesure réelle ponctuelle** _(choix de conception)_ : un script lancé à la main depuis le Mac
  appelle les fonctions d'extraction (pas la route, pour ne pas écrire dans `parse_stats`),
  fait les vrais fetchs de pages et les vrais appels Ticketmaster (gratuits), sans aucune
  écriture en base. C'est ce script qui produit le rapport avant/après et juge l'objectif
  « 9 sur 14 ».

## 8. Contraintes techniques connues

- `src/app/api/sortie/parse-ticket-url/route.ts` (846 lignes) contient tout : fetch, extraction
  OG/JSON-LD, dates FR, slug, Ticketmaster, télémétrie. Les fonctions d'extraction ne sont pas
  exportées. Un test `route.test.ts` existe.
- Rate limit 10 req/min/IP (Upstash), timeout fetch 5 s, page tronquée à 500 KB.
- Hosts CTS Eventim (Fnac Spectacles…) : fetch sauté (WAF), Ticketmaster en secours — à
  conserver.
- `findEventDetails` (Gemini 2.5 Flash + Google Search) renvoie déjà `heroImageUrl`, `venue`,
  `startsAt` et filtre les URLs d'image douteuses.
- Publication : le lien Vercel–GitHub est cassé à ce jour ; publication manuelle (cf.
  mémoire projet).

## 9. Laissé au constructeur

- Découpage du code (extraire l'extraction dans `src/features/sortie/lib/` pour la rendre
  testable, ou non).
- Seuils exacts et heuristiques supplémentaires de détection d'image générique, tant que les
  5 cas connus sont rejetés et que les 24 cas réussis restent réussis.
- Mesure de taille d'image (lecture des premiers octets) ou heuristique sans fetch.
- Format exact des fixtures et du rapport avant/après.
- Découpage en PRs (une par volet : image / salle / heure recommandé).

## 10. Points ouverts

**Résultat mesuré (2026-10-27, benchmark réel, `scripts/sortie/parse-benchmark.after.md`)** :

| Mesure                                                         | Avant | Après                                                                                                            |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| Images à récupérer trouvées (14 manuelles + 3 génériques auto) | 3/17  | 6/17 (5/14 sur le jeu manuel d'origine)                                                                          |
| Images auto perdues                                            | 5/21  | 4/21                                                                                                             |
| Salle juste                                                    | 12/38 | 26/38, aucune salle fausse restante                                                                              |
| Heure juste                                                    | 4/38  | 6/38                                                                                                             |
| Heure fausse (02:00, 01:00, décalage)                          | 6     | 0 — les 3 restantes signalées sont des heures publiées par la salle, différentes de l'horaire choisi par l'owner |

**Objectif image (≥ 9/14) non atteint.** Ticketmaster ne fournit pour plusieurs spectacles
de théâtre (Sarah Lele, Tristan Lopin, Infiniment Robin) que des images de catégorie,
désormais rejetées ; plusieurs pages ont disparu (404) depuis la création. Décision owner
attendue sur une phase 2 Gemini.

- Phase 2 Gemini : à décider par l'owner seulement si la mesure réelle n'atteint pas l'objectif
  image.

- Cas BilletRéduc inexpliqué (affiche trouvée puis remplacée par la même image en plus basse
  qualité). À surveiller ; ne bloque pas ce chantier.
