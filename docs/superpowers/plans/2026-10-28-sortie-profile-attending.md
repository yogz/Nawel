# Profil — sorties où je vais : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le profil `/@<username>` liste aussi les sorties d'autrui où l'utilisateur va ; la vitrine publique devient inerte (image, titre, salle) ; le lien privé garde tout pour ses sorties et montre celles d'autrui sans moyen de s'y inscrire.

**Architecture:** une requête élargie (`listProfileOutings`) renvoie des lignes marquées `isOwn` + nom/@ de l'organisateur. Les règles pures (découpage à venir/passées, réduction « vitrine », description de partage) vivent dans `lib/profile-outings.ts`. Un seul composant serveur inerte `OutingShowcaseCard` sert à la vitrine publique et aux sorties d'autrui en lien privé. La page profil et l'image OG consomment ces briques.

**Tech Stack:** Next.js 16 App Router (Server Components), React 19, Drizzle 0.45, Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-28-sortie-profile-attending-design.md`

## Global Constraints

- Sortie = FR-only, strings en dur, pas de `useTranslations`.
- Palette « Acid Cabinet » inversée (`ink-700` = crème, `surface-50` = noir) — copier les classes des cartes existantes (`outing-profile-card.tsx`), ne pas en inventer.
- Pas de `any` ; tests co-localisés `*.test.ts(x)`.
- Sorties d'autrui incluses ssi participant de l'utilisateur avec `response IN ('yes','handle_own')` ; toutes les sorties listées : `showOnProfile = true` et `status <> 'cancelled'`.
- Mode public (`!inboxMode`) : **aucune date** (ni `Date`, ni libellé) dans les props envoyées au rendu des cartes, aucun `<a>`/`Link` vers une sortie, pas de compteur de participants, pas de compte à rebours.
- Sorties d'autrui en mode lien privé / suiveur : date + salle + « organisé par … », aucun `Link`, aucun `InlineRsvpSection`.
- Pas de migration DB.
- Un commit par tâche, conventional commits, fin de message : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. L'utilisateur est à la fois créateur et participant `yes` de sa sortie (cas systématique) → la sortie apparaît **une seule fois**, `isOwn = true`. (Pinné par la requête `EXISTS`, vérifié en Task 5 étape 3.)
2. Sortie d'autrui créée par un anonyme (`creatorUserId = null`) → apparaît, `isOwn = false`, mention « organisé par » absente (pas « organisé par null »). (Test `organizerLabel`, Task 1.)
3. Sondage d'autrui non tranché où l'utilisateur a seulement voté (`interested`) → absent. Sondage tranché sans date fixe → `startsAt = null` → classé « à venir ». (Tests Task 1.)
4. Visiteur en mode inbox : le regroupement par action (`bucketizeByAction`) ne doit recevoir **que** les sorties de l'utilisateur, sinon une sortie d'autrui tombe en « à toi de jouer » sans bouton. (Pinné Task 4.)
5. Vitrine publique : la page HTML rendue ne contient ni la date d'une sortie ni un lien `/<slug>-<shortId>`. (Vérifié Task 5 par curl.)

---

### Task 1: Règles pures du profil

**Files:**

- Create: `src/features/sortie/lib/profile-outings.ts`
- Test: `src/features/sortie/lib/profile-outings.test.ts`

**Interfaces:**

- Produces:
  - `export const ATTENDING_RESPONSES = ["yes", "handle_own"] as const;`
  - `export type ProfileOutingRow = { id: string; shortId: string; slug: string | null; title: string; location: string | null; startsAt: Date | null; deadlineAt: Date; status: string; mode: "fixed" | "vote"; heroImageUrl: string | null; createdAt: Date; confirmedCount: number; creatorUserId: string | null; creatorName: string | null; creatorUsername: string | null; }`
  - `export type ProfileOuting = ProfileOutingRow & { isOwn: boolean };`
  - `export function splitProfileOutings(rows: ProfileOutingRow[], userId: string, now: Date): { upcoming: ProfileOuting[]; past: ProfileOuting[] }` — `upcoming` = `startsAt` null ou `>= now` ; `past` = `startsAt < now` ; l'ordre d'entrée est conservé (la requête trie `desc(createdAt)`).
  - `export type ShowcaseOuting = { id: string; title: string; location: string | null; heroImageUrl: string | null };`
  - `export function toShowcaseOuting(o: ProfileOuting): ShowcaseOuting` — retourne **exactement** ces 4 clés.
  - `export function organizerLabel(o: ProfileOuting): string | null` — `null` si `isOwn` ; sinon `"organisé par @<username>"`, à défaut `"organisé par <name>"`, à défaut `null`.
  - `export function buildProfileDescription(args: { upcomingTitles: string[]; pastCount: number }): string` — remplace la version datée de `page.tsx`.

- [ ] **Step 1: Écrire les tests**

```ts
describe("splitProfileOutings", () => {
  it("marque isOwn selon creatorUserId", ...); // créateur "u1" → true ; "u2" → false ; null → false
  it("classe startsAt null en à venir et startsAt < now en passées", ...);
  it("conserve l'ordre d'entrée", ...);
});
describe("toShowcaseOuting", () => {
  it("ne garde que id, title, location, heroImageUrl", () => {
    expect(Object.keys(toShowcaseOuting(row)).sort()).toEqual(["heroImageUrl", "id", "location", "title"]);
  });
});
describe("organizerLabel", () => {
  it("null pour ses propres sorties", ...);
  it("préfère le @username", () => expect(organizerLabel(other)).toBe("organisé par @cecile"));
  it("retombe sur le nom puis sur null (créateur anonyme)", ...);
});
describe("buildProfileDescription", () => {
  it("liste 3 titres sans date + overflow", () =>
    expect(buildProfileDescription({ upcomingTitles: ["A", "B", "C", "D", "E"], pastCount: 0 }))
      .toBe("A · B · C · +2 autres"));
  it("tronque un titre > 32 caractères avec …", ...);
  it("aucune à venir, des passées", () =>
    expect(buildProfileDescription({ upcomingTitles: [], pastCount: 2 }))
      .toBe("2 sorties passées · la prochaine arrive bientôt."));
  it("rien du tout", () =>
    expect(buildProfileDescription({ upcomingTitles: [], pastCount: 0 }))
      .toBe("Les prochaines sorties arriveront ici."));
});
```

- [ ] **Step 2:** `npx vitest run src/features/sortie/lib/profile-outings.test.ts` → FAIL (module absent).
- [ ] **Step 3:** implémenter `profile-outings.ts` (reprendre `truncateTitle` et les libellés de `page.tsx` ; `+1 autre` au singulier).
- [ ] **Step 4:** même commande → PASS.
- [ ] **Step 5:** commit `feat(sortie): règles du profil — sorties où je vais`.

### Task 2: Carte vitrine inerte

**Files:**

- Create: `src/features/sortie/components/outing-showcase-card.tsx` (Server Component, pas de `"use client"`)
- Test: `src/features/sortie/components/outing-showcase-card.test.tsx`

**Interfaces:**

- Consumes: `ShowcaseOuting` (Task 1), `formatVenue`, `OutingPosterFallback`, `getPastOutingClasses`, `OUTING_IMAGE_FILTER`.
- Produces: `export function OutingShowcaseCard(props: { outing: ShowcaseOuting; isPast: boolean; dateLabel?: string | null; organizerLabel?: string | null }): JSX.Element`

Rendu : `<article>` reprenant la rangée image 64 px + titre + salle de `OutingProfileCard` (mêmes classes), `dateLabel` en eyebrow acid au-dessus du titre s'il est fourni, `organizerLabel` en ligne meta sous la salle s'il est fourni. Aucun `Link`, aucun chevron, aucun état hover de navigation.

- [ ] **Step 1: tests**

```tsx
it("affiche titre et salle, sans lien", () => {
  const { container } = render(<OutingShowcaseCard outing={o} isPast={false} />);
  expect(screen.getByText("Pilote | Sitcom improvisée")).toBeTruthy();
  expect(screen.getByText(formatVenue("Le Métropole")!)).toBeTruthy();
  expect(container.querySelector("a")).toBeNull();
});
it("affiche dateLabel et organizerLabel quand fournis", ...);
it("n'affiche aucune eyebrow date quand dateLabel est absent", ...); // pas de p.text-acid-600
it("utilise le poster de repli sans image", ...);
```

- [ ] **Step 2:** `npx vitest run src/features/sortie/components/outing-showcase-card.test.tsx` → FAIL.
- [ ] **Step 3:** implémenter.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat(sortie): carte vitrine inerte pour le profil`.

### Task 3: Requête élargie

**Files:**

- Modify: `src/features/sortie/queries/outing-queries.ts:334-375` (`listPublicProfileOutings` → renommer `listProfileOutings`)
- Modify: appelants `src/app/(sortie)/sortie/profile/[username]/page.tsx`, `src/app/(sortie)/sortie/profile/[username]/opengraph-image.tsx` (renommage seul ici)

**Interfaces:**

- Consumes: `ATTENDING_RESPONSES`, `ProfileOutingRow`, `splitProfileOutings` (Task 1).
- Produces: `export const listProfileOutings = cache(async (userId: string, now = new Date()): Promise<{ upcoming: ProfileOuting[]; past: ProfileOuting[] }>)`

Requête unique : colonnes actuelles + `creatorUserId`, `creatorName: user.name`, `creatorUsername: user.username` via `leftJoin(user, eq(user.id, outings.creatorUserId))` ; `where and(or(eq(outings.creatorUserId, userId), exists(select 1 from participants where participants.outing_id = outings.id and participants.user_id = userId and response in ATTENDING_RESPONSES)), eq(outings.showOnProfile, true), ne(outings.status, "cancelled"))` ; `orderBy(desc(outings.createdAt))`, `limit(50)` ; puis `splitProfileOutings(rows, userId, now)`. Qualifier les colonnes dans le sous-select corrélé comme `confirmedCountSql` (cf. son commentaire sur la collision `id`). Mettre à jour le JSDoc.

- [ ] **Step 1:** implémenter + renommer chez les deux appelants (comportement de la page inchangé à ce stade).
- [ ] **Step 2:** `npm run typecheck` → 0 erreur.
- [ ] **Step 3:** commit `feat(sortie): le profil inclut les sorties d'autrui où l'on va`.

### Task 4: Page profil — vitrine publique et lien privé

**Files:**

- Modify: `src/app/(sortie)/sortie/profile/[username]/page.tsx`

**Interfaces:**

- Consumes: `listProfileOutings` (Task 3), `toShowcaseOuting`, `organizerLabel`, `buildProfileDescription` (Task 1), `OutingShowcaseCard` (Task 2), `formatOutingDateShort`.

Comportement :

- `upcoming = sortUpcomingByStartsAt(upcomingRaw)` ; `ownUpcoming = upcoming.filter(o => o.isOwn)` ; `othersUpcoming = upcoming.filter(o => !o.isOwn)`.
- **Mode public** (`!inboxMode`) : supprimer `heroOuting`/`LiveStatusHero` et `RecentlyAddedRow`. Section « à venir » = toutes les `upcoming` en `OutingShowcaseCard` avec `outing={toShowcaseOuting(o)}` et **sans** `dateLabel`/`organizerLabel`. `PastSection` = même rendu (3 inline + `<details>`). Bio, bouton partager, empty state : inchangés.
- **Mode inbox** : `RecentlyAddedRow` et `InboxSection` reçoivent **uniquement** `ownUpcoming` (y compris `listMyParticipantsForOutings({ outingIds: ownUpcoming.map(o => o.id), … })`). Nouvelle section après, si `othersUpcoming.length > 0` : eyebrow `─ {prénom} y va aussi` (prénom = premier mot de `row.name`), cartes `OutingShowcaseCard` avec `dateLabel={o.startsAt ? formatOutingDateShort(o.startsAt) : null}` et `organizerLabel={organizerLabel(o)}`. `PastSection` : sorties propres en `OutingProfileCard` comme aujourd'hui, sorties d'autrui en `OutingShowcaseCard` avec date + organisateur.
- `generateMetadata` : `description = buildProfileDescription({ upcomingTitles: sortUpcomingByStartsAt(upcoming).map(o => o.title), pastCount: past.length })` ; supprimer `buildProfileDescription`/`truncateTitle`/`SHORT_DATE_FMT` locaux. Titre inchangé.
- Supprimer les imports devenus inutiles ; mettre à jour le commentaire du hero.

- [ ] **Step 1:** implémenter.
- [ ] **Step 2:** `npm run check && npm test` → tout vert.
- [ ] **Step 3:** commit `feat(sortie): profil public en vitrine, lien privé avec les sorties d'autrui`.

### Task 5: Image de partage sans date + vérification réelle

**Files:**

- Modify: `src/app/(sortie)/sortie/profile/[username]/opengraph-image.tsx`

Comportement : `featured = sortUpcomingByStartsAt(upcoming).slice(0, MENU_LIMIT)` (sorties non datées incluses, plus de filtre `dated`) ; `MenuRow` n'affiche que le titre (supprimer la colonne jour/mois, `dayFmt`, `monthShortFmt`, `TZ`) ; supprimer le cas « Dates en cours de coordination » ; mettre à jour le commentaire d'en-tête (« menu des prochaines sorties, sans date »). `buildAgendaLabel` inchangé.

- [ ] **Step 1:** implémenter ; `npm run check && npm test` → vert.
- [ ] **Step 2:** commit `feat(sortie): aperçu de partage du profil sans date`.
- [ ] **Step 3: vérification réelle** — `npm run dev`, puis (cf. mémoire « Tester Sortie en local ») :
  - `curl -s -H "Host: sortie.colist.fr" http://localhost:3000/@nicolas` → la sortie « Pilote | Sitcom improvisée » apparaît une seule fois ; `grep -c 'href="/pilote-sitcom'` = 0 ; aucun libellé de date de carte (`grep -E "[0-9]{1,2} (janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)\.? · [0-9]{1,2}h"` vide) ; la meta `og:description` liste des titres sans date.
  - `curl -s -o /tmp/og.png -w "%{http_code} %{content_type}" -H "Host: sortie.colist.fr" http://localhost:3000/@nicolas/opengraph-image` → `200 image/png`, puis lire l'image.
  - Le mode lien privé n'est pas vérifiable par curl sans le jeton (secret, ne pas le lire) : il est couvert par les tests de Task 2 et par la relecture ; le signaler à l'owner pour un essai manuel avec son lien.
  - Coller les sorties dans le compte rendu.

### Task 6: Revue de fin de branche

- [ ] Sub-agent simplification (code mort : `LiveStatusHero` reste utilisé par la home, ne pas le supprimer ; imports orphelins ; commentaires obsolètes) puis revue de branche ; corriger, `npm run check && npm test`, commit `refactor(sortie): …` si nécessaire.
