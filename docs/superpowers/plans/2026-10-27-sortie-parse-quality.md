# Sortie — qualité du parse de lien (image, salle, heure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quand on colle un lien de spectacle, l'app remplit la bonne affiche, le vrai nom de la salle et l'heure sans intervention, et n'invente jamais une heure ni une image d'un autre spectacle.

**Architecture:** On sort la logique de `parse-ticket-url/route.ts` (846 lignes, rien d'exporté) vers des modules purs testables dans `src/features/sortie/lib/event-parse/`, la route ne gardant que rate-limit, validation et télémétrie. On ajoute un filtre d'images génériques, un choix de salle robuste, une extraction date/heure en heure de Paris côté serveur (la réponse expose `date` + `time` séparés au lieu de `startsAt`), et une recherche Ticketmaster par le titre, contrôlée, pour les sites de salles. Un script de benchmark lancé à la main mesure avant/après sur les vrais liens.

**Tech Stack:** Next.js 16 route handler, TypeScript, Vitest, `postgres` (lecture seule dans le script), Ticketmaster Discovery (existant).

**Spec:** `docs/superpowers/specs/2026-10-27-sortie-parse-quality-design.md`

## Global Constraints

- Aucun test ni script n'appelle la route réelle ni n'écrit en base : la base locale **est** la base de production ; la route écrit dans `parse_stats`.
- Tout fetch externe de la route passe par `safeFetchExternal` (inchangé).
- Pire cas de latence inchangé : 5 s fetch page + 5 s Ticketmaster, pas d'étape bloquante en plus.
- Gemini hors périmètre (`findEventDetails` non appelé par le parse).
- Comportement existant pour `ticketmaster.fr` et les hosts CTS Eventim conservé tel quel.
- Une donnée de recherche (Ticketmaster) ne remplit que les champs vides, jamais d'écrasement de la page.
- Mieux vaut vide que faux : en cas d'ambiguïté sur l'heure ou l'image, renvoyer `null`.
- Pas de migration, pas de nouvelle colonne.
- Sortie FR-only : chaînes françaises en dur, pas de `useTranslations`.
- Tests co-localisés `*.test.ts` ; `npm run typecheck` et les tests touchés verts à chaque commit.
- Branche `feat/sortie-parse-quality`, un commit par tâche, conventional commits, PR à la fin.

## Review Focus

1. Page multi-représentations (Opéra, Châtelet : plusieurs Events JSON-LD ou plusieurs dates) avec des heures différentes → `time: null` (pas la première heure venue). Test dans Task 5.
2. Texte contenant d'autres heures près de la date (« Ouverture des portes 19h00 – concert 20h30 ») → `time: null` si plusieurs heures distinctes dans la fenêtre. Test dans Task 5.
3. `og:image` relative ou sans protocole (`/img/a.jpg`, `//cdn.x/a.jpg`) → URL absolue résolue sur l'URL de la page avant le filtre générique. Test dans Task 3.
4. Résultat Ticketmaster homonyme mais autre date (tournée) alors que la page a donné une date → rejeté. Test dans Task 6.
5. `og:site_name` avec entités HTML (`L&#039;Olympia`) ou préfixe `@` (`@sohoplace`) → salle affichée « L'Olympia », « Sohoplace ». Test dans Task 4.

---

## File Structure

| Fichier                                                                           | Responsabilité                                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/features/sortie/lib/event-parse/extract-page.ts`                             | Extraction pure HTML → `PageData` (OG, JSON-LD, dates FR, entités). Déplacé de la route.           |
| `src/features/sortie/lib/event-parse/event-image.ts`                              | `isGenericImageUrl`, `pickPageImage`.                                                              |
| `src/features/sortie/lib/event-parse/venue.ts`                                    | `pickVenue`, `isUnusableVenueName`.                                                                |
| `src/features/sortie/lib/event-parse/date-time.ts`                                | `toParisDateTime`, `findShowTime`.                                                                 |
| `src/features/sortie/lib/event-parse/ticketmaster-match.ts`                       | `isTicketmasterMatch`.                                                                             |
| `src/features/sortie/lib/event-parse/parse-event-url.ts`                          | Orchestration fetch → extraction → enrichissement → `ParsedEvent` (sans rate-limit ni télémétrie). |
| `src/app/api/sortie/parse-ticket-url/route.ts`                                    | Rate-limit, validation, appel `parseEventUrl`, télémétrie, JSON.                                   |
| `src/features/sortie/components/create-wizard/index.tsx`                          | Lecture de `date`/`time` au lieu de `startsAt`.                                                    |
| `scripts/sortie/parse-benchmark.ts` + `scripts/sortie/parse-benchmark.cases.json` | Mesure réelle avant/après, lecture seule.                                                          |

---

### Task 1: Extraire la logique du parse hors de la route (sans changement de comportement)

**Files:**

- Create: `src/features/sortie/lib/event-parse/extract-page.ts`, `src/features/sortie/lib/event-parse/parse-event-url.ts`, `src/features/sortie/lib/event-parse/extract-page.test.ts`
- Modify: `src/app/api/sortie/parse-ticket-url/route.ts`
- Test: `src/app/api/sortie/parse-ticket-url/route.test.ts` (existant, doit rester vert sans modification)

**Interfaces:**

- Produces:
  - `type PageData = { title?: string; venue?: string; image?: string; startsAt?: string; siteName?: string; description?: string; jsonLdVenue?: string }` — `startsAt` reste brut à ce stade. Champs ajoutés plus tard : `jsonLdImage?: string`, `ogImageWidth?: number` (Task 3) ; `jsonLdStartDates?: string[]` (tous les `startDate` des Events JSON-LD), `text?: string` (Task 5).
  - `extractPage(html: string): PageData` (= l'actuel `extractOg`, étendu pour exposer `siteName`, `description`, `jsonLdVenue`).
  - `parseEventUrl(target: URL): Promise<{ event: ParsedEventLegacy; telemetry: { fetched: boolean; wafBlocked: boolean; pageGotSomething: boolean; pageImage: boolean } }>` où `ParsedEventLegacy = { title: string|null; venue: string|null; image: string|null; startsAt: string|null; ticketUrl: string; parserHint: ParserHint|null }` (forme de réponse actuelle).
  - `type ParserHint = { kind: "waf" | "spa"; siteName: string; suggestion: string }`.

- [ ] **Step 1:** Écrire `extract-page.test.ts` : `extractPage` sur un HTML minimal avec `og:title`, `og:site_name="Salle Pleyel"`, JSON-LD Event `{name, location:{name:"Grande Salle"}, startDate:"2026-06-18"}` → `siteName === "Salle Pleyel"`, `jsonLdVenue === "Grande Salle"`, `startsAt === "2026-06-18"`.
- [ ] **Step 2:** `npx vitest run src/features/sortie/lib/event-parse/extract-page.test.ts` → FAIL (module absent).
- [ ] **Step 3:** Déplacer `decodeHtmlEntities`, `extractJsonLd`, `extractFrenchDate`, `looksLikeVenue`, `splitTitleAndVenue`, `extractOg` dans `extract-page.ts` (renommer `extractOg` → `extractPage`, ajouter les champs). Déplacer slug, CTS/SPA, fetch, merge TM et `parserHint` dans `parseEventUrl`. La route ne garde que rate-limit, validation d'entrée, `isLikelyPrivateHostname`, `trackParseAttempt(…, telemetry)` et la réponse JSON.
- [ ] **Step 4:** `npx vitest run src/features/sortie/lib/event-parse src/app/api/sortie/parse-ticket-url` → tout PASS, `route.test.ts` inchangé. `npm run typecheck` → 0 erreur.
- [ ] **Step 5:** Commit `refactor(sortie): extrait la logique du parse de lien hors de la route`.

### Task 2: Jeu de référence et benchmark réel (mesure « avant »)

**Files:**

- Create: `scripts/sortie/parse-benchmark.ts`, `scripts/sortie/parse-benchmark.cases.json`, `scripts/sortie/parse-benchmark.baseline.md`
- Modify: `CLAUDE.md` (section Commands : une ligne pour lancer le benchmark)

**Interfaces:**

- Consumes: `parseEventUrl` (Task 1).
- Produces: `cases.json` = `Array<{ shortId: string; url: string; expect: { image: "generic-rejected" | "none" | { contains: string } | "any"; venue: string | null; time: string | null } }>` ; commande `npx tsx scripts/sortie/parse-benchmark.ts [--out <file.md>]`.

- [ ] **Step 1:** Écrire le script : lit en **lecture seule** (`postgres`, `SELECT` uniquement) `short_id, event_link, location, fixed_datetime, hero_image_url` des sorties non annulées avec lien ; pour chaque cas de `cases.json`, appelle `parseEventUrl` (vrais fetchs + vrais appels Ticketmaster, aucune écriture), compare à `expect`, imprime un tableau Markdown (image / salle / heure : OK, KO, valeur obtenue) et un total « images manuelles récupérées : x/14 ».
- [ ] **Step 2:** Construire `cases.json` à la main pour les 38 liens : salle attendue = nom réel de la salle ; heure attendue = celle de la page si elle l'affiche, sinon `null` ; image attendue fixée en comparant visuellement l'image trouvée et l'image publiée (méthode Pilote). Les 5 génériques connus (`Logo-LOlympia-jaune.png`, `logo-theatredeloeuvre.svg`, `adidasarena.com/seo.jpg`, `photo-concert-plenitude-arena-foule.jpg`, `…_110.png` Digitick) → `"generic-rejected"`. Cas douteux marqués `"any"` et listés « à confirmer par l'owner » dans le rapport.
- [ ] **Step 3:** Lancer `npx tsx scripts/sortie/parse-benchmark.ts --out scripts/sortie/parse-benchmark.baseline.md` → rapport « avant » produit, aucune écriture en base (vérifier qu'aucune requête autre que `SELECT` n'est émise).
- [ ] **Step 4:** Commit `test(sortie): benchmark réel du parse de lien + mesure de référence`.

### Task 3: Rejeter les images génériques et lire l'image JSON-LD

**Files:**

- Create: `src/features/sortie/lib/event-parse/event-image.ts`, `src/features/sortie/lib/event-parse/event-image.test.ts`
- Modify: `extract-page.ts` (expose `jsonLdImage`, `ogImageWidth`), `parse-event-url.ts`, `route.ts` (télémétrie `imageFound` = image de page **non générique**)

**Interfaces:**

- Produces:
  - `isGenericImageUrl(url: string, ctx: { siteName?: string; hostname: string; declaredWidth?: number }): boolean`
  - `pickPageImage(page: PageData, pageUrl: URL): string | undefined` — ordre : `jsonLdImage` puis `og:image`/`twitter:image`, chacune résolue en URL absolue sur `pageUrl`, la première non générique gagne.

- [ ] **Step 1:** Tests `isGenericImageUrl` → `true` pour les 5 URLs réelles du §2 (avec `siteName` « L'Olympia », « Le Théâtre de l'Œuvre », « adidas arena », « Plenitude Arena », « theatredeloeuvre ») ; `false` pour `https://www.billetreduc.com/static/event/325471.jpeg`, une image `deneb.philharmoniedeparis.fr/…`, une image `s1.ticketm.net/…`. Tests `pickPageImage` : JSON-LD image prioritaire ; og:image logo + JSON-LD absent → `undefined` ; `og:image="/img/a.jpg"` sur `https://x.fr/spectacle` → `https://x.fr/img/a.jpg` ; `//cdn.x/a.jpg` → `https://cdn.x/a.jpg`.
- [ ] **Step 2:** `npx vitest run src/features/sortie/lib/event-parse/event-image.test.ts` → FAIL.
- [ ] **Step 3:** Implémenter. Règles minimales du spec : extension `.svg` ; nom de fichier contenant `logo|seo|default|share|placeholder|favicon|vignette|thumb` ; suffixe de taille `_\d{2,3}\.` < 400 ; `declaredWidth` (`og:image:width`) < 400 ; nom de fichier contenant le nom du site ou de la marque du host slugifié (≥ 5 caractères, ex. `plenitude-arena`, `olympia`). Brancher `pickPageImage` dans `parseEventUrl` à la place de `og.image`.
- [ ] **Step 4:** Tests du dossier `event-parse` + `route.test.ts` → PASS ; puis `npx tsx scripts/sortie/parse-benchmark.ts` → aucun des 24 cas auto qui passaient ne régresse ; les 5 génériques sont rejetés.
- [ ] **Step 5:** Commit `feat(sortie): le parse ignore les logos et images génériques des sites`.

### Task 4: Choisir le vrai nom de la salle

**Files:**

- Create: `src/features/sortie/lib/event-parse/venue.ts`, `src/features/sortie/lib/event-parse/venue.test.ts`
- Modify: `extract-page.ts` (le choix de salle sort de `extractPage`, qui expose seulement les candidats), `parse-event-url.ts`

**Interfaces:**

- Produces:
  - `isUnusableVenueName(name: string): boolean` — salle interne (`/^(grande|petite)\s+salle\b/i`, `/^salle\s+\d+/i`, `/^studio\b/i`) ou adresse (commence par un numéro suivi d'un mot de voie, ou contient un code postal à 5 chiffres).
  - `pickVenue(c: { jsonLdVenue?: string; siteName?: string; title?: string; description?: string; hostname: string }): string | undefined`
  - `VENUE_HOST_NAMES: Record<string, string>` — `{ "accorarena.com": "Accor Arena", "adidasarena.com": "Adidas Arena" }` (affichage propre quand `og:site_name` est un identifiant en minuscules).

- [ ] **Step 1:** Tests `pickVenue` : `{ jsonLdVenue: "Grande Salle", siteName: "Théâtre du Châtelet" }` → « Théâtre du Châtelet » ; `{ jsonLdVenue: "17 Avenue du Général Eisenhower, 75008 Paris", siteName: "Grand Palais" }` → « Grand Palais » ; `{ siteName: "Salle Pleyel" }` → « Salle Pleyel » ; `{ siteName: "accorarena", hostname: "accorarena.com" }` → « Accor Arena » ; `{ siteName: "L&#039;Olympia" }` → « L'Olympia » ; `{ siteName: "@sohoplace" }` → « Sohoplace » ; host billetterie (`billetreduc.com`, `ticketmaster.fr`, `digitick.com`, `shotgun.live`) → `siteName` jamais retenu comme salle ; `{ jsonLdVenue: "L'Olympia" }` → « L'Olympia ».
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter : JSON-LD utilisable > `og:site_name` (décodé, `@` retiré, nom propre via `VENUE_HOST_NAMES`) si le host n'est pas une billetterie > logique actuelle (`splitTitleAndVenue`, première phrase de description si `looksLikeVenue`).
- [ ] **Step 4:** Tests `event-parse` + route → PASS ; benchmark → colonne salle sans régression, Châtelet / Grand Palais / Pleyel / Accor Arena corrects.
- [ ] **Step 5:** Commit `feat(sortie): le parse retrouve le vrai nom de la salle`.

### Task 5: Date et heure en heure de Paris, et fin du « 02:00 »

**Files:**

- Create: `src/features/sortie/lib/event-parse/date-time.ts`, `src/features/sortie/lib/event-parse/date-time.test.ts`
- Modify: `parse-event-url.ts`, `route.ts`, `route.test.ts` (forme de réponse), `src/features/sortie/components/create-wizard/index.tsx` (type `onParsed` ~l. 835 et handler ~l. 585-605)

**Interfaces:**

- Produces:
  - `toParisDateTime(raw: string): { date: string | null; time: string | null }` — `date` `"YYYY-MM-DD"`, `time` `"HH:MM"`, tous deux en Europe/Paris.
  - `findShowTime(text: string, date: string): string | null`
  - Réponse de la route : `{ title, venue, image, date: string|null, time: string|null, ticketUrl, parserHint }` — **`startsAt` supprimé**.

- [ ] **Step 1:** Tests `toParisDateTime` : `"2026-06-18"` → `{date:"2026-06-18", time:null}` ; `"2027-03-11T20:00"` → `20:00` ; `"2026-06-15T19:30:00+02:00"` → `19:30` ; `"2026-11-25T18:00:00Z"` → `{date:"2026-11-25", time:"19:00"}` ; `"20270508T19:30:0"` → `{date:"2027-05-08", time:"19:30"}` ; chaîne invalide → `{date:null,time:null}`. Tests `findShowTime(text, "2026-11-11")` : « mercredi 11 novembre 2026 à 20h » → `"20:00"` ; « 11/11/2026 – 20h30 » → `"20:30"` ; « 11 novembre · Ouverture des portes 19h00 – concert 20h30 » → `null` ; heure à plus de 80 caractères de la date → `null` ; plusieurs représentations à des heures différentes → `null`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter (fuseau via `Intl.DateTimeFormat` `timeZone: "Europe/Paris"`, ISO sans offset traité comme heure de Paris). Dans `parseEventUrl` : `toParisDateTime(page.startsAt)` ; si `time` null et `date` connue → `findShowTime(page.description + page.text, date)` ; si `page.jsonLdStartDates` contient des heures différentes → `time: null`. `extract-page.ts` expose `text` = texte visible tronqué (sans balises, ≤ 20 000 caractères) et `jsonLdStartDates`. Wizard : `onParsed` reçoit `date`/`time` ; `draft.date = new Date(y, m-1, d)` (local) si `date`, `draft.time = time` **seulement si non null** ; plus aucun `new Date(startsAt).getHours()`. Mettre à jour `route.test.ts` (attendus `startsAt` → `date`/`time`).
- [ ] **Step 4:** `npx vitest run src/features/sortie src/app/api/sortie` → PASS ; `npm run typecheck` → 0 ; benchmark → colonne heure : aucune heure fausse ; Châtelet/Grand Palais sans heure inventée.
- [ ] **Step 5:** Commit `fix(sortie): heure du spectacle en heure de Paris, plus de 02:00 inventé`.

### Task 6: Recherche Ticketmaster par le titre pour les sites de salles

**Files:**

- Create: `src/features/sortie/lib/event-parse/ticketmaster-match.ts`, `src/features/sortie/lib/event-parse/ticketmaster-match.test.ts`
- Modify: `parse-event-url.ts`, `route.test.ts` (nouveaux cas)

**Interfaces:**

- Consumes: `searchTicketmasterEvents(query, limit, "parse-enrich")` (existant, `src/features/sortie/lib/ticketmaster-search.ts`), `toParisDateTime` (Task 5), `pickPageImage` (Task 3).
- Produces: `isTicketmasterMatch(r: TicketmasterResult, page: { title: string; date: string | null }): boolean`.

- [ ] **Step 1:** Tests `isTicketmasterMatch` : titres normalisés (minuscules, sans accents ni ponctuation) dont ≥ 60 % des mots de la page se retrouvent dans le résultat → `true` (« Céline Dion » vs « CELINE DION - Courage World Tour ») ; titre sans rapport → `false` ; même titre mais `startsAt` Paris ≠ `page.date` → `false` ; `page.date` null → titre seul suffit. Tests route : host de salle sans image valable → appel Ticketmaster avec le titre de la page, image (et salle/date/heure vides) remplies depuis le premier résultat qui matche ; page avec image valable → **aucun** appel Ticketmaster ; `ticketmaster.fr` / CTS → comportement existant (tests actuels inchangés).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implémenter dans `parseEventUrl` : si host ni `ticketmaster.fr` ni CTS, pas d'image de page valable, et un titre connu → `searchTicketmasterEvents(title, 3, "parse-enrich")`, premier résultat qui matche ; ne remplir que les champs vides (salle = `venue` TM sans la ville ; date/heure via `toParisDateTime`).
- [ ] **Step 4:** Tests → PASS ; benchmark → total « images manuelles récupérées » ≥ 9/14, sans régression sur les 24 auto. Si < 9/14, l'écrire tel quel dans le rapport (décision owner sur une phase Gemini, cf. spec §10) — ne pas forcer.
- [ ] **Step 5:** Commit `feat(sortie): le parse cherche l'affiche sur Ticketmaster quand le site de la salle n'en donne pas`.

### Task 7: Rapport final et PR

**Files:**

- Create: `scripts/sortie/parse-benchmark.after.md`
- Modify: `docs/superpowers/specs/2026-10-27-sortie-parse-quality-design.md` (§10 : résultat mesuré)

- [ ] **Step 1:** `npx tsx scripts/sortie/parse-benchmark.ts --out scripts/sortie/parse-benchmark.after.md` → rapport après ; tableau avant/après cas par cas.
- [ ] **Step 2:** `npm test` (seuls les 6 échecs CoList préexistants tolérés), `npm run typecheck` → 0, `npx eslint` sur les fichiers touchés → 0.
- [ ] **Step 3:** Commit `docs(sortie): résultats du benchmark parse avant/après`, push, PR avec le résumé chiffré et la liste « à confirmer par l'owner ».
