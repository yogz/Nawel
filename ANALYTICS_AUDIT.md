# Analytics Audit — Phase 1

_Auditeur : Claude Code · Date : 2026-05-05 · Scope : tracking produit Sortie + état du tracking CoList legacy_

> Phase 1 du plan « Audit + refonte de l'analytics produit ». **Aucun code modifié ici** — uniquement findings et recommandation d'orientation. À valider par l'owner avant Phase 2.

---

## TL;DR

1. **Sortie a un tracking produit riche mais sous-exploité.** ~28 events distincts émis ; **seulement ~10 sont lus** par `wizard-umami-stats.ts` / le dashboard. ~18 events sont du « write-only » (bruit Umami, coût visuel sur l'admin).
2. **Trois piles parallèles de tracking** coexistent sans frontière claire :
   - `src/lib/analytics.ts` (CoList legacy, 338 lignes, 13 helpers, 17 imports actifs)
   - `src/features/sortie/lib/{wizard,outing}-telemetry.ts` (Sortie produit)
   - `sendGAEvent` direct (auth, landing, payment-method, error-boundary)
3. **CoList et Sortie partagent le même `data-website-id` Umami** (`383d4d2b-…`). Tous les events sont mélangés dans une seule vue Umami → la « stat globale » du dashboard inclut des visiteurs CoList. Décision à prendre : split (2 sites) ou tag (`app=sortie|colist` sur tout).
4. **Aucune mesure de rétention ni de K-factor possible aujourd'hui** — `setUmamiUserId` n'est jamais appelé sur Sortie (le composant `AnalyticsSessionSync` est monté uniquement dans `(colist)/[locale]/layout.tsx`, pas dans `(sortie)/layout.tsx`). Toute la fenêtre Umami est anonyme côté Sortie.
5. **Aucun event d'auth émis depuis Sortie.** `SortieAuthForm` n'a aucune télémétrie ; les events `login` / `sign_up` / `magic_link_request` viennent exclusivement du `AuthForm` CoList.
6. **Recommandation CoList** : **NO-GO sur la conservation en l'état**. Isoler `src/lib/analytics.ts` (renommer → `src/lib/analytics-colist.ts`, déplacer hors du namespace neutre) ET tagger toutes les call-sites avec `app: "colist"`. Voir §5.

---

## 1. Inventaire des events

### 1.1 Convention de lecture

- **Source** : où l'event est défini (helper) ou émis directement.
- **Lu par dashboard** : `oui` si présent dans `wizard-umami-stats.ts` ou `umami-api.ts` ; `non` sinon.
- **Classification** :
  - `produit-sortie` → décisions produit Sortie
  - `produit-colist` → décisions produit CoList legacy
  - `tech` → erreurs, perf, A/B variant
  - `legacy_unsure` → ambiguous, à arbitrer

### 1.2 Pile Sortie produit (`wizard-telemetry.ts` + `outing-telemetry.ts`)

| Event                         | Fichier                 | Propriétés émises                                                                                                                      | Call sites                                             | Lu dashboard                                                      | Classif               |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | --------------------- |
| `wizard_step_paste_entered`   | wizard-telemetry.ts:46  | `step`, `from_step`                                                                                                                    | wizard hook (auto)                                     | **oui** (funnel)                                                  | produit-sortie        |
| `wizard_step_title_entered`   | idem                    | idem                                                                                                                                   | idem                                                   | **non**                                                           | produit-sortie        |
| `wizard_step_confirm_entered` | idem                    | idem                                                                                                                                   | idem                                                   | **oui** (count séparé)                                            | produit-sortie        |
| `wizard_step_date_entered`    | idem                    | idem                                                                                                                                   | idem                                                   | **oui** (funnel)                                                  | produit-sortie        |
| `wizard_step_venue_entered`   | idem                    | idem                                                                                                                                   | idem                                                   | **non**                                                           | produit-sortie        |
| `wizard_step_name_entered`    | idem                    | idem                                                                                                                                   | idem                                                   | **non**                                                           | produit-sortie        |
| `wizard_step_commit_entered`  | idem                    | idem                                                                                                                                   | idem                                                   | **oui** (funnel)                                                  | produit-sortie        |
| `wizard_step_entered_other`   | idem                    | `step`, `from_step`                                                                                                                    | fallback safe                                          | **non**                                                           | tech                  |
| `wizard_step_exited`          | idem                    | `step`, `duration_ms`, `outcome` (advanced/back/abandoned)                                                                             | wizard hook                                            | **non**                                                           | produit-sortie        |
| `wizard_paste_submitted`      | idem                    | `kind` (url/text), `has_vibe`                                                                                                          | create-wizard:1000,1083                                | **oui** (`kind` + funnel)                                         | produit-sortie        |
| `wizard_suggestion_picked`    | idem                    | `source` (tm/oa/gemini)                                                                                                                | create-wizard:1119,1191                                | **non**                                                           | produit-sortie        |
| `wizard_gemini_started`       | idem                    | `trigger` (auto/optin/bg)                                                                                                              | create-wizard:940                                      | **oui** (`trigger`)                                               | produit-sortie        |
| `wizard_gemini_completed`     | idem                    | `outcome`, `duration_ms`                                                                                                               | wizard hook closure                                    | **non**                                                           | produit-sortie        |
| `wizard_publish_started`      | idem                    | `mode`, `is_logged_in`                                                                                                                 | create-wizard:466                                      | **non**                                                           | produit-sortie        |
| `wizard_publish_succeeded`    | idem                    | `mode`, `is_logged_in`, `has_email`, `has_venue`, `has_ticket_url`, `has_hero_image`, `paste_to_publish_ms`, `paste_to_publish_bucket` | create-wizard:471                                      | **oui** (count + `_ms` + `_bucket` ; **6/8 propriétés non lues**) | produit-sortie        |
| `wizard_publish_failed`       | idem                    | `reason` (validation/server/network)                                                                                                   | create-wizard:482,487                                  | **non**                                                           | produit-sortie        |
| `wizard_abandoned`            | idem                    | `last_step`, `total_duration_ms`                                                                                                       | wizard hook unmount                                    | **non**                                                           | produit-sortie        |
| `outing_viewed`               | outing-telemetry.ts:36  | `mode`, `is_creator`, `is_logged_in`, `has_responded`, `source`                                                                        | outing-view-tracker.tsx:42                             | **oui** (count seul ; **5/5 propriétés non lues**)                | produit-sortie        |
| `outing_share_clicked`        | outing-telemetry.ts:62  | `channel` (whatsapp/native/copy/fallback_prompt), `placement` (hero/actions_row)                                                       | share-actions.tsx (4×), create-success-banner.tsx (2×) | **oui** (count + `channel` ; `placement` non lu)                  | produit-sortie        |
| `outing_rsvp_set`             | outing-telemetry.ts:78  | `response` (yes/no/handle_own), `delta` (new/switched), `is_logged_in`, `has_email`                                                    | rsvp-prompt.tsx:82,181,246                             | **oui** (count + `response` ; **3/4 propriétés non lues**)        | produit-sortie        |
| `outing_ticket_clicked`       | outing-telemetry.ts:99  | —                                                                                                                                      | **0 call-sites** trouvés en code source                | **non**                                                           | produit-sortie (mort) |
| `outing_ics_downloaded`       | outing-telemetry.ts:107 | —                                                                                                                                      | **0 call-sites** trouvés en code source                | **non**                                                           | produit-sortie (mort) |

> ⚠️ **Surprise majeure** : `trackOutingTicketClicked` et `trackOutingIcsDownloaded` sont définis et exportés mais **jamais appelés** en code. Vérifier si l'outing page a réellement un bouton billet/ICS avec un onClick câblé — sinon ce sont 2 events fantômes.

### 1.3 Pile Sortie auxiliaire (`sendGAEvent` direct)

| Event                                           | Fichier                                          | Propriétés                                 | Call sites                    | Lu dashboard | Classif        |
| ----------------------------------------------- | ------------------------------------------------ | ------------------------------------------ | ----------------------------- | ------------ | -------------- |
| `payment_method_prefilled`                      | payment-method-prefill.ts:39                     | `type`                                     | (à confirmer côté formulaire) | **non**      | produit-sortie |
| `payment_method_added`                          | payment-method-prefill.ts:45                     | `type`, `was_prefilled`, `value_unchanged` | idem                          | **non**      | produit-sortie |
| `landing_v2_view` (`LANDING_EVENTS.view`)       | landing/landing-v2.tsx:19                        | —                                          | 1                             | **non**      | produit-sortie |
| `landing_section_visible`                       | landing/section-{how-it-works,card-showcase}.tsx | `section`                                  | 2                             | **non**      | produit-sortie |
| `landing_cta_click` (`LANDING_EVENTS.ctaClick`) | landing/landing-cta-button.tsx:22                | `position`                                 | 1                             | **non**      | produit-sortie |
| `landing_login_click`                           | landing/{landing-v2, public-hero}.tsx            | `position`                                 | 2                             | **non**      | produit-sortie |

### 1.4 Pile CoList legacy (`src/lib/analytics.ts` + `sendGAEvent` direct dans CoList)

| Event                                         | Helper                 | Call sites (fichiers)                                                    | Lu dashboard Sortie | Classif                                     |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ | ------------------- | ------------------------------------------- |
| `tab_changed`                                 | trackTabChange         | tab-bar.tsx                                                              | non                 | produit-colist                              |
| `item_created/updated/deleted/assigned/moved` | trackItemAction        | items/use-item-handlers.ts (5×)                                          | non                 | produit-colist                              |
| `person_created/updated/deleted`              | trackPersonAction      | people/use-person-handlers.ts (3×)                                       | non                 | produit-colist                              |
| `meal_created/updated/deleted`                | trackMealServiceAction | meals/use-meal-handlers.ts (5×)                                          | non                 | produit-colist                              |
| `service_created/updated/deleted`             | idem                   | services/use-service-handlers.ts (3×)                                    | non                 | produit-colist                              |
| `share_opened`, `share_link_copied`           | trackShareAction       | events/share-modal.tsx (4×)                                              | non                 | produit-colist                              |
| `ai_ingredients_generated_batch`              | trackAIAction          | hooks/use-shopping-generation.ts                                         | non                 | produit-colist                              |
| `filter_changed`                              | trackFilterChange      | (à vérifier — import présent mais call inconnu)                          | non                 | legacy_unsure                               |
| `drag_drop_used`                              | trackDragDrop          | items/use-item-handlers.ts                                               | non                 | produit-colist                              |
| `discover_click`                              | trackDiscoverClick     | landing/shared/hero-section.tsx                                          | non                 | produit-colist                              |
| `feature_viewed`                              | trackFeatureView       | landing/shared/feature-card.tsx                                          | non                 | produit-colist                              |
| `demo_viewed`, `demo_step`                    | trackDemoView/Step     | components/demo-interactive.tsx + landing/demo-interactive.tsx (doublon) | non                 | produit-colist                              |
| `faq_interaction`                             | trackFaqInteraction    | components/faq.tsx + landing/faq.tsx (doublon)                           | non                 | produit-colist                              |
| `performance_timing`                          | trackPerformance       | analytics-monitor.tsx                                                    | non                 | tech                                        |
| `exception`                                   | trackError             | analytics-monitor.tsx                                                    | non                 | tech                                        |
| `event_created`                               | sendGAEvent direct     | (colist)/create-event/create-event-client.tsx                            | non                 | produit-colist                              |
| `app_error`                                   | sendGAEvent direct     | (colist)/[locale]/error.tsx                                              | non                 | tech-colist                                 |
| `react_error_boundary`                        | sendGAEvent direct     | components/common/error-boundary.tsx                                     | non                 | tech (CoList only — pas dans Sortie layout) |
| `cta_click`                                   | sendGAEvent direct     | landing/{sticky-cta, cta-footer, hero-section}.tsx                       | non                 | produit-colist                              |
| `landing_variant_assigned`                    | sendGAEvent direct     | components/common/cookie-consent.tsx                                     | non                 | produit-colist                              |
| `shopping_item_checked`                       | sendGAEvent direct     | planning/shopping-list-sheet.tsx                                         | non                 | produit-colist                              |

### 1.5 Pile auth (partagée mais déclenchée uniquement par CoList)

> `AuthForm` (`src/components/auth/auth-form.tsx`) est utilisé par `auth-modal.tsx` et `login-form.tsx` — tous deux mountés en zone CoList. **Sortie utilise `SortieAuthForm`** (`src/features/sortie/components/sortie-auth-form.tsx`) qui **n'émet aucun event**.

| Event                                         | Fichier                                         | Propriétés                         | Call sites | Origine effective                                        |
| --------------------------------------------- | ----------------------------------------------- | ---------------------------------- | ---------- | -------------------------------------------------------- |
| `login`                                       | auth-form.tsx                                   | `method` (magic_link/email/google) | 3×         | CoList                                                   |
| `sign_up`                                     | auth-form.tsx                                   | `method`                           | 1×         | CoList                                                   |
| `auth_error`                                  | auth-form.tsx                                   | `error_type`, `method`             | 6×         | CoList                                                   |
| `magic_link_request`                          | auth-form.tsx                                   | `success`                          | 1×         | CoList                                                   |
| `forgot_password_request`                     | auth-form.tsx                                   | `success`                          | 1×         | CoList                                                   |
| `auth_mode_toggle`                            | auth-form.tsx                                   | `target_mode`                      | 2×         | CoList                                                   |
| `auth_method_toggle`                          | auth-form.tsx                                   | (autre)                            | 1×         | CoList                                                   |
| `guest_continued_without_auth`                | features/auth/components/guest-access-sheet.tsx | —                                  | 1×         | CoList only (sheet utilisé dans `components/planning/*`) |
| `person_claimed_profile`, `person_joined_new` | features/auth/components/claim-person-sheet.tsx | —                                  | 2×         | CoList only                                              |

### 1.6 Tech telemetry tierce (DB-backed, pas Umami)

Hors scope strict mais à noter pour cohérence du dashboard :

- `serviceCallStats` (table Postgres) — `trackServiceCall(service, source, outcome)` dans `src/features/sortie/lib/service-call-stats.ts`. Lu par `getServiceCallStats` dans le dashboard (sections Gemini, Discovery API).
- `parseAttempts` / hostBreakdown — `trackParseAttempt` (cf. parsing URL OG). Lu par `getParseAggregate` / `getHostBreakdown`.
- `outings` count par jour — lu par `getOutingsCreatedPerDay`.

Ces 3 sources alimentent la moitié inférieure du `stat-dashboard.tsx`. À conserver telles quelles (pas Umami, peu de bruit).

### 1.7 Volume estimé

- **Sortie produit** (wizard + outing + payment + landing) : 22 events distincts, **~30 call-sites** dans le code Sortie actif.
- **CoList produit** (analytics.ts + colist sendGAEvent) : 22 events distincts, **~25 call-sites** sur du code CoList non-Sortie.
- **Tech / shared** (auth, error-boundary, performance, cookie-consent) : ~12 events, ~16 call-sites.
- **Total réel : ~56 events distincts, ~70 call-sites** — supérieur à l'estimation prompt (28/63), justifié par la présence de la couche CoList legacy et de la pile auth.

---

## 2. Doublons et incohérences

### 2.1 Conventions de nommage divergentes

| Convention                                                            | Origine        | Exemples                                                                             |
| --------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `snake_case` plat préfixé domaine                                     | Sortie produit | `wizard_step_paste_entered`, `outing_share_clicked`, `payment_method_added`          |
| `snake_case` plat sans préfixe                                        | CoList produit | `item_created`, `tab_changed`, `cta_click`, `event_created`, `shopping_item_checked` |
| `domain_action` style GA4                                             | Pile auth      | `login`, `sign_up`, `auth_error`                                                     |
| `landing_v2_view` vs `landing_section_visible` vs `landing_cta_click` | Sortie landing | Préfixe `landing_` mais pas `sortie_` → collision possible avec landing CoList       |

→ **Recommandation Phase 3** : préfixer **systématiquement par `app`** (`sortie_*`, `colist_*`) ou ajouter une propriété `app` (≤ 6 chars) sur 100% des events.

### 2.2 Collisions de noms

- **`cta_click`** est émis par **CoList** (3 fichiers : `sticky-cta`, `cta-footer`, `hero-section`). **Sortie** émet `landing_cta_click`. Mais comme les 2 apps tapent dans le même Umami site → un user verra `cta_click` dans le top-events et ne saura pas si c'est CoList ou Sortie sans inspecter `location` / `variant`.
- **`landing_*`** : la convention « v2 » de Sortie (`landing_v2_view`) suggère implicitement qu'un `landing_view` existe ailleurs — il n'existe pas en code. Bug latent : si CoList ajoute un `landing_view`, la collision sera silencieuse.
- **Doublon de fichier** : `src/components/demo-interactive.tsx` ET `src/components/landing/demo-interactive.tsx` émettent les mêmes events (`demo_viewed`, `demo_step`) avec la même variant `"landing"`. À valider : sont-ils tous deux montés ? L'un est-il mort ?
- **Doublon de fichier** : `src/components/faq.tsx` ET `src/components/landing/faq.tsx` émettent le même `faq_interaction`. Idem.

### 2.3 Mélange CoList + Sortie dans Umami

**`data-website-id` identique** (`383d4d2b-6e94-4215-b02e-39ddc800134b`) dans les 2 layouts (`(colist)/[locale]/layout.tsx:176` et `(sortie)/layout.tsx:94`).

Conséquences mesurables sur le dashboard `/sortie/admin/stat` aujourd'hui :

- `getWebsiteStats` (`/stats`) → KPIs visiteurs/pageviews/visits **mélangés** CoList+Sortie.
- `getActiveVisitors` (`/active`) → idem.
- `getTopMetric(range, "url")` / `"referrer"` → top paths/referrers mélangés.
- Funnel wizard et events `outing_*` : pas de collision (préfixés), donc isolés naturellement.

→ **À trancher Phase 2** : split en 2 websites Umami (préféré, plus propre, gratuit côté Umami) **ou** ajouter `data-domains` côté Umami pour filtrer par hostname **ou** tagger chaque event d'une dimension `app`.

### 2.4 Inconsistance `IS_DEV` / consent / debug mode

`src/lib/analytics.ts` filtre par consent, par `IS_DEV`, par flag debug `localStorage.getItem("analytics_debug")`. Les piles `wizard-telemetry.ts` et `outing-telemetry.ts` n'ont **aucun** de ces filtres — elles tirent direct via `sendGAEvent` qui log un `console.debug` en dev mais émet quand même en prod sans gate consent. Si demain le RGPD revient (un visiteur EU exige opt-in strict), Sortie n'a pas de mécanisme.

`umami.ts` ne porte aucun guard non plus → cohérent avec la posture actuelle (« opt-in par défaut true »), mais à mentionner si la posture change.

### 2.5 `setUmamiUserId` cassé pour Sortie

- Défini dans `src/lib/umami.ts:37`.
- Wrapped par `setAnalyticsUserId` dans `src/lib/analytics.ts:53` (CoList).
- Appelé uniquement par `src/components/analytics/analytics-session-sync.tsx:16,18`.
- Ce composant est monté **uniquement** dans `(colist)/[locale]/layout.tsx:228`. **Pas dans `(sortie)/layout.tsx`**.

→ Sur Sortie, **toute la donnée Umami est anonyme**. Pas de cohorte, pas de rétention multi-session, pas de LTV par user.

---

## 3. Dead code (events tracked mais jamais lus)

### 3.1 Pile Sortie (events émis, jamais lus par le dashboard)

| Event                                                                                                                                 | Sévérité  | Recommandation Phase 3                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wizard_step_title_entered`, `_venue_entered`, `_name_entered`                                                                        | basse     | **Conserver** : utiles pour funnels future si on étend le funnel à 7 steps. Faible coût.                                                                                               |
| `wizard_step_entered_other`                                                                                                           | basse     | **Conserver** (fallback safe TS).                                                                                                                                                      |
| `wizard_step_exited`                                                                                                                  | moyenne   | **Conserver et exposer** : sa propriété `outcome` (advanced/back/abandoned) est la donnée clé pour identifier les drop-offs par step. Aujourd'hui invisible.                           |
| `wizard_suggestion_picked`                                                                                                            | moyenne   | **Exposer** : décide si Gemini vs TM/OA est utile (mesure d'alimentation du wizard).                                                                                                   |
| `wizard_gemini_completed`                                                                                                             | **haute** | **Exposer urgent** : `outcome` (found/not_found/cancelled/error) + `duration_ms` est la métrique de qualité de Gemini. Sans ça, on ne sait pas si Gemini fonctionne ou plante en prod. |
| `wizard_publish_started` vs `wizard_publish_succeeded`                                                                                | moyenne   | **Exposer** : ratio = taux de succès de l'étape commit (≠ funnel global).                                                                                                              |
| `wizard_publish_failed`                                                                                                               | **haute** | **Exposer urgent** : `reason` (validation/server/network) → alerte si bug serveur silencieux en prod.                                                                                  |
| `wizard_abandoned`                                                                                                                    | haute     | **Exposer** : `last_step` répond directement à « où on perd les users ».                                                                                                               |
| `outing_ticket_clicked`                                                                                                               | bug ?     | **À investiguer** : déclaré, exporté, jamais appelé. Soit câbler les boutons billet, soit supprimer.                                                                                   |
| `outing_ics_downloaded`                                                                                                               | bug ?     | Idem.                                                                                                                                                                                  |
| `outing_viewed` propriétés non lues (`mode`, `is_creator`, `is_logged_in`, `has_responded`, `source`)                                 | **haute** | **Exposer** : la propriété `source` (share/internal/direct) répond à la question phare « qui arrive par le partage ? » qui est la viralité même.                                       |
| `outing_share_clicked.placement`                                                                                                      | basse     | Exposer si on veut comparer hero vs actions_row, sinon laisser.                                                                                                                        |
| `outing_rsvp_set` propriétés non lues (`delta`, `is_logged_in`, `has_email`)                                                          | moyenne   | **Exposer** : `delta=switched` détecte les yes/no/yes (signal de friction). `has_email` = signal d'engagement.                                                                         |
| `wizard_publish_succeeded` propriétés non lues (`mode`, `is_logged_in`, `has_email`, `has_venue`, `has_ticket_url`, `has_hero_image`) | moyenne   | **Exposer** : profile types de sorties créées. Sans ça impossible de répondre « qui crée des sorties à billet vs sorties libres ? ».                                                   |
| `payment_method_prefilled`, `payment_method_added`                                                                                    | basse     | **Exposer** : décision sur le passage prefill localStorage → BDD serveur (commentaire dans le fichier le mentionne).                                                                   |
| `landing_v2_view`, `landing_section_visible`, `landing_cta_click`, `landing_login_click`                                              | basse     | **Exposer** : c'est l'instrumentation déjà câblée pour A/B la landing. Mort actuellement.                                                                                              |

### 3.2 Pile CoList legacy

Tous les events `item_*`, `meal_*`, `person_*`, `service_*`, `tab_changed`, `share_opened`, `event_created`, `cta_click`, `discover_click`, `feature_viewed`, `demo_viewed`, `demo_step`, `faq_interaction`, `landing_variant_assigned`, `shopping_item_checked`, `ai_ingredients_generated_batch`, `drag_drop_used`, `filter_changed`, `performance_timing`, `react_error_boundary`, `app_error` sont **émis mais jamais lus** dans le code actuel (ni le dashboard Sortie ni un autre dashboard CoList côté code — j'ai cherché, aucune query Umami CoList n'existe).

→ Soit ils sont consultés directement dans Umami Cloud par l'owner (lecture manuelle, pas de dashboard), soit ils sont du bruit pur. **Question owner** : utilise-tu Umami Cloud pour lire ces events CoList aujourd'hui ?

### 3.3 Doublons fichiers à arbitrer

- `src/components/demo-interactive.tsx` vs `src/components/landing/demo-interactive.tsx` (mêmes events).
- `src/components/faq.tsx` vs `src/components/landing/faq.tsx` (mêmes events).

→ Identifier le mort, le supprimer, ou clarifier les responsabilités.

---

## 4. Gaps du parcours utilisateur Sortie

Lecture systématique des routes `(sortie)/sortie/...` croisée avec les events existants. **Étape sans event** = gap.

| Étape parcours                      | Routes / fichiers                                               | Event existant ?                                  | Gap ?                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrivée landing v2 (anonyme)        | `(sortie)/sortie/page.tsx:60` → `LandingV2`                     | `landing_v2_view`                                 | OK (mais non lu)                                                                                                                                                                                  |
| Clic CTA landing                    | landing-cta-button                                              | `landing_cta_click`                               | OK (non lu)                                                                                                                                                                                       |
| Clic login depuis landing           | public-hero, landing-v2                                         | `landing_login_click`                             | OK (non lu)                                                                                                                                                                                       |
| Page login                          | `(sortie)/sortie/login/page.tsx` → `SortieAuthForm`             | **aucun**                                         | **🔴 GAP MAJEUR** : pas de `auth_signin_started`, `auth_signin_succeeded`, `auth_signin_failed`, ni `magic_link_requested`, ni `signup_completed`. Impossible de mesurer le funnel d'auth Sortie. |
| Identification user (post-auth)     | (devrait être un effet sur session)                             | `setUmamiUserId` jamais appelé                    | **🔴 GAP MAJEUR** : pas de cohorte / rétention (cf. §2.5).                                                                                                                                        |
| Wizard `/nouvelle`                  | `(sortie)/sortie/nouvelle/page.tsx` + `create-wizard/index.tsx` | 17 events `wizard_*`                              | OK (riche, mais 80% non lu)                                                                                                                                                                       |
| Vue sortie (logged in / anon)       | `(sortie)/sortie/[slugOrId]/page.tsx` + outing-view-tracker     | `outing_viewed`                                   | OK                                                                                                                                                                                                |
| RSVP                                | rsvp-prompt                                                     | `outing_rsvp_set`                                 | OK                                                                                                                                                                                                |
| Partage                             | share-actions, create-success-banner                            | `outing_share_clicked`                            | OK                                                                                                                                                                                                |
| Clic billet externe                 | (à câbler)                                                      | `outing_ticket_clicked` défini, **jamais appelé** | **🟡 dead trigger**                                                                                                                                                                               |
| Téléchargement .ics                 | (à câbler)                                                      | `outing_ics_downloaded` défini, **jamais appelé** | **🟡 dead trigger**                                                                                                                                                                               |
| Page billets `/billets`             | `(sortie)/sortie/[slugOrId]/billets/page.tsx`                   | aucun                                             | gap potentiel — selon importance produit                                                                                                                                                          |
| Achat / réservation `/achat`        | `(sortie)/sortie/[slugOrId]/achat/page.tsx`                     | aucun                                             | **🔴 GAP** si parcours d'achat est central                                                                                                                                                        |
| Confirmation post-achat             | `create-success-banner.tsx`                                     | aucun (autre que share)                           | gap — pas d'event de revenue / commit final côté ticket                                                                                                                                           |
| Édition sortie `/modifier`          | `(sortie)/sortie/[slugOrId]/modifier/page.tsx`                  | aucun                                             | gap mineur (qty editing < creation)                                                                                                                                                               |
| Suivi profile `/profile/[username]` | `(sortie)/sortie/profile/[username]/page.tsx`                   | aucun (`follow-toggle` n'émet rien)               | gap — référence sociale non mesurée                                                                                                                                                               |
| Agenda perso `/moi`, `/agenda`      |                                                                 | aucun                                             | gap rétention (visite récurrente d'un user actif)                                                                                                                                                 |
| Reset device                        | reset-device-trigger                                            | aucun                                             | gap — flow sensible UX-critique                                                                                                                                                                   |
| Calendar feed `/calendar/[token]`   | route.ts                                                        | aucun                                             | gap mineur                                                                                                                                                                                        |
| Page d'erreur globale               | (Sortie a-t-elle un error.tsx ?)                                | `app_error` côté CoList only                      | gap — Sortie n'a pas son `error.tsx` instrumenté                                                                                                                                                  |

### Récapitulatif des gaps critiques

1. **Auth funnel Sortie** : 0 event sur `SortieAuthForm`. Cible Phase 3.
2. **Identification user** : `setUmamiUserId` non câblé. Cible Phase 3.
3. **Conversion d'achat** : `/achat` non instrumenté.
4. **Référence / follow** : pas d'event sur follow-toggle, follower-list.
5. **Retour de l'utilisateur** : pas d'event `outing_return_visit` ni `wizard_first_session` (impossible de distinguer 1ʳᵉ visite vs récurrente sans `setUmamiUserId`).

---

## 5. Décision GO/NO-GO sur le tracking CoList

### Constat

- **17 imports actifs** de `@/lib/analytics` dans `src/`.
- **0 query Umami** lit les events CoList (dans le code actuel).
- **0 dashboard CoList** existe (le seul dashboard est `(sortie)/admin/stat`).
- **CoList partage le `data-website-id` Sortie** → tout est mélangé.
- **`src/lib/analytics.ts` (338 lignes)** est dans un namespace neutre (`@/lib/`) qui suggère « lib partagée », mais n'est utilisé que par CoList — confusion dangereuse pour la suite (un dev pourrait appeler `trackItemAction` depuis Sortie en pensant que c'est partagé).

### Recommandation : NO-GO sur la conservation en l'état → **isoler**

**Plan d'isolation (à exécuter Phase 3, pas maintenant)** :

1. **Renommer** `src/lib/analytics.ts` → `src/lib/analytics-colist.ts` (ou mieux : `src/features/colist/lib/analytics.ts` si on accepte de créer la feature folder CoList symétrique à Sortie).
2. **Mettre à jour les 17 imports** (sed mécanique).
3. **Tagger** chaque appel CoList avec `app: "colist"` côté `trackEvent` (modif locale dans `analytics-colist.ts`).
4. **Tagger** Sortie (wizard-telemetry, outing-telemetry, payment-method-prefill, landing) avec `app: "sortie"` (idem, modif locale dans 3 fichiers helpers).
5. **OPTIONNEL mais recommandé** : split en 2 websites Umami distincts (`colist.umami` et `sortie.umami`) avec des `data-website-id` différents par layout. Avantages : top-paths / top-referrers / KPIs site naturellement isolés, pas besoin de filtrer côté requête.

### Alternative (plus radicale, à valider owner)

Si CoList est en sunset / mode maintenance et que **personne ne lit ses events** :

- **Supprimer 100%** des call-sites CoList → `analytics.ts`, `analytics-monitor.tsx`, `analytics-session-sync.tsx`, `cookie-consent.tsx`, `error-boundary.tsx` (CoList only), tous les imports dans `features/{items,meals,people,services,events}` et `components/{landing,planning,layout,faq,demo-interactive}`.
- Net : ~338 lignes de `lib/analytics.ts` + ~25 call-sites supprimés. Réduction substantielle de la surface mentale.

### Question à trancher avec l'owner avant Phase 3

> **CoList est-elle encore une app active produit ?** Si oui → isoler (option 1). Si elle est en sunset et que personne ne lit Umami CoList → supprimer (option 2). C'est la décision principale à prendre avant la Phase 2 (cadre AAARRR — pas la peine de cadrer CoList si elle disparaît).

---

## 6. Synthèse des décisions à prendre avant Phase 2

| #   | Décision                                                                  | Recommandation auditeur                                                                                                      |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Quel sort réserver à CoList tracking ?                                    | **Isoler** si CoList active, **supprimer** si sunset (à confirmer owner).                                                    |
| 2   | Split Umami en 2 websites ?                                               | **Oui** — coût zéro, valeur immédiate (KPIs site non pollués).                                                               |
| 3   | Tag `app` systématique sur tous les events ?                              | **Oui** — défense en profondeur même avec split, simplifie un éventuel cross-app.                                            |
| 4   | Câbler `setUmamiUserId` sur Sortie ?                                      | **Oui — bloquant** pour Phase 2 (rétention impossible sinon).                                                                |
| 5   | Instrumenter `SortieAuthForm` ?                                           | **Oui — bloquant** pour Phase 2 (acquisition impossible sinon).                                                              |
| 6   | Câbler ou supprimer `outing_ticket_clicked` / `_ics_downloaded` ?         | **Câbler** — outing-telemetry les définit avec un commentaire métier clair, l'absence de call-site ressemble à un oubli.     |
| 7   | Doublons `demo-interactive`/`faq` (× 2 fichiers)                          | **Investiguer** : 1 mort à supprimer, 1 vivant à garder.                                                                     |
| 8   | Garder ou supprimer les events tracked-but-not-read côté Sortie produit ? | **Garder + exposer** ceux marqués « moyenne / haute » au §3.1. **Supprimer** uniquement si réelle preuve de nuisance volume. |

---

## 7. Annexe : périmètre de l'audit

- Code lu intégralement : `src/lib/umami.ts`, `src/lib/analytics.ts`, `src/features/sortie/lib/wizard-telemetry.ts`, `src/features/sortie/lib/outing-telemetry.ts`, `src/features/sortie/lib/payment-method-prefill.ts`, `src/features/sortie/queries/wizard-umami-stats.ts`, `src/features/sortie/lib/umami-api.ts`, `src/features/sortie/hooks/use-wizard-telemetry.ts`, `src/features/sortie/components/landing/landing-events.ts`, `src/app/(sortie)/layout.tsx`, `src/app/(sortie)/sortie/admin/stat/page.tsx`, `src/app/(sortie)/sortie/stat/page.tsx`, `src/app/(sortie)/sortie/admin/layout.tsx`.
- Code lu partiellement (head/grep) : `src/features/sortie/components/stat-dashboard.tsx`, `src/features/sortie/components/sortie-auth-form.tsx`, `src/components/auth/auth-form.tsx`, `src/app/(sortie)/sortie/page.tsx`, `src/app/(colist)/[locale]/layout.tsx`.
- Routes parcourues : intégralité de `src/app/(sortie)/sortie/**/page.tsx`.
- **Non audité (hors scope Phase 1)** : pages CoList, contenu de chaque sheet RSVP, logique exacte du serveur de purchase / billet, contenu de `service-call-stats.ts` (au-delà des 40 premières lignes), formulaire de payment-method (callers réels de `trackPaymentMethod*`).

Hypothèses validables avant Phase 2 si l'owner valide ce rapport :

- Hypothèse 1 : CoList est encore en service produit (sinon § 5 option 2).
- Hypothèse 2 : aucun dashboard externe ne lit les events CoList (sinon ils ne sont pas dead).
- Hypothèse 3 : l'owner ne lit pas Umami Cloud manuellement les events listés en §3.2 (sinon ils ne sont pas dead).

---

## 8. Phase 2 — Cadre AAARRR Sortie

_Section ajoutée 2026-05-05 après validation owner. Décisions §6 résolues : split Umami fait (commit `63377a6`), CoList reste active (le tag `app:` est abandonné — redondant maintenant que les sites sont distincts), §5 réduit à un éventuel rename cosmétique de `lib/analytics.ts` qui peut être skippé._

### 8.1 Logique du framework

Sortie n'a pas de revenu direct → 4 étapes : **Acquisition, Activation, Rétention, Référence**. La **Référence (K-factor)** est le levier #1 du produit puisque chaque sortie publiée est intrinsèquement virale (les invitations sont envoyées par le créateur à son cercle, qui peuvent à leur tour publier).

Pour chaque étape, on dérive 2-3 questions actionnables, on liste l'event qui répond (existant ou à ajouter) et on fixe un seuil d'alerte. Les seuils sont des **valeurs initiales à recalibrer après 4 semaines de mesure** ; ils servent à amorcer la lecture du dashboard, pas à juger en absolu.

### 8.2 Acquisition — qui arrive sur Sortie, par quel canal ?

| #   | Question actionnable                               | Event qui répond                                                     | Métrique                                | Seuil d'alerte                                                                                                       | État Phase 1                                                    |
| --- | -------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A1  | Le trafic croît-il semaine sur semaine ?           | `getWebsiteStats` (visitors + comparison built-in)                   | Δ visiteurs uniques 7j vs 7j précédents | `< -20%` = critique ; `< 0%` 2 semaines de suite = warning                                                           | **OK** — exposé dans dashboard                                  |
| A2  | D'où viennent les visiteurs ?                      | `getTopMetric(range, "referrer")`                                    | Top 5 referrers + part du `direct`      | `direct > 80%` ET zéro referrer organique = produit sans canal d'acquisition (dépend du bouche-à-oreille hors-ligne) | **OK** — exposé                                                 |
| A3  | Le partage actif génère-t-il des vues ?            | `outing_share_clicked` (count) + `outing_viewed { source: "share" }` | ratio = vues_share / shares_clicked     | `< 0.5` = liens partagés peu cliqués (faux clic, message qui passe mal)                                              | **🔴 GAP** — `outing_viewed.source` non lue ; à exposer Phase 3 |
| A4  | Quelle landing convertit ? (préparation A/B futur) | `landing_v2_view` + `landing_section_visible` + `landing_cta_click`  | scroll depth + CTR landing              | `landing_cta_click / landing_v2_view < 5%` = landing inactive                                                        | **🟡 PARTIEL** — events émis non lus ; à exposer Phase 3        |

### 8.3 Activation — % visiteurs qui font une 1ʳᵉ action utile

Définition : un visiteur est **activé** s'il (a) publie une sortie OU (b) répond à un RSVP. Les deux sont des actions « productrices » qui font vivre le réseau.

| #   | Question actionnable                                            | Event qui répond                                                                     | Métrique                                | Seuil d'alerte                                                                                                                                   | État Phase 1                                                         |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Ac1 | Quelle proportion des arrivées landing entre dans le wizard ?   | `landing_v2_view` → `wizard_step_paste_entered`                                      | ratio paste_entered / landing_view      | `< 15%` = la landing ne vend pas le wizard                                                                                                       | **🔴 GAP** — `landing_v2_view` non lue ; à exposer Phase 3           |
| Ac2 | Quelle proportion qui démarre le wizard publie ?                | `wizard_step_paste_entered` → `wizard_publish_succeeded`                             | conversion funnel global wizard         | `< 35%` = friction wizard ; `< 50%` = warning                                                                                                    | **OK** — funnel exposé                                               |
| Ac3 | À quelle étape du wizard on perd le plus ?                      | `wizard_step_*_entered` chaînés + `wizard_abandoned.last_step`                       | step où le drop > 25% du step précédent | step `paste→date` drop > 30% = le branching paste/title bug ; step `commit→publish` drop > 15% = un bug d'auth ou de validation à la publication | **🟡 PARTIEL** — funnel exposé, `wizard_abandoned.last_step` non lue |
| Ac4 | Pourquoi le wizard échoue-t-il ?                                | `wizard_publish_failed.reason`                                                       | distribution validation/server/network  | `server > 5%` = bug backend ; `network > 10%` = problème CDN/proxy                                                                               | **🔴 GAP** — event émis non lu ; **urgent** Phase 3                  |
| Ac5 | Combien de visiteurs sortie partagée font une action (RSVP) ?   | `outing_viewed` → `outing_rsvp_set`                                                  | conversion vue → RSVP                   | `< 25%` = page sortie ne convainc pas                                                                                                            | **OK** — exposé                                                      |
| Ac6 | Quelle proportion des nouveaux signups passe à une 1ʳᵉ action ? | `auth_signup_completed` (à ajouter) → `wizard_publish_succeeded` ∪ `outing_rsvp_set` | activation post-signup à J+1            | `< 60%` = onboarding cassé                                                                                                                       | **🔴 GAP** — `SortieAuthForm` n'émet rien ; **bloquant** Phase 3     |

### 8.4 Rétention — % users qui reviennent à J+7 / J+30

> ⚠️ **Bloqueur structurel** : `setUmamiUserId` n'est pas câblé sur Sortie (cf. §2.5). Sans ça, Umami ne peut pas reconstruire de cohorte. **Priorité absolue Phase 3.** En attendant, les métriques ci-dessous sont approximables via `visits / visitors` global mais pas mesurables par cohorte.

| #   | Question actionnable                                       | Event qui répond                                               | Métrique                                      | Seuil d'alerte                                               | État Phase 1                                 |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| R1  | % users actifs J0 qui reviennent à J+7                     | session-cohorte Umami (nécessite `setUmamiUserId`)             | retention curve J+7                           | `< 20%` = produit one-shot                                   | **🔴 BLOQUÉ** par auth/identification        |
| R2  | Combien de visites moyennes par user actif sur 30j ?       | `getWebsiteStats(30j)` ratio `visits / visitors`               | ≥ 3 = bon engagement, < 2 = engagement faible | `< 1.5` = users qui ne reviennent jamais                     | **🟡 APPROXIMATIF** sans userId mais lisible |
| R3  | Les users récurrents publient-ils plus de 1 sortie ?       | `wizard_publish_succeeded` count + cohorte user                | médiane outings_per_user                      | médiane = 1 = app one-shot ; médiane ≥ 2 = produit récurrent | **🔴 BLOQUÉ** par identification             |
| R4  | Les agendas perso (`/moi`, `/agenda`) sont-ils consultés ? | pageview Umami sur `/moi`, `/agenda` (déjà capturé par script) | visites / user actif                          | `< 1` par semaine = surfaces mortes                          | **OK** via topPaths existant                 |

**Recommandation** : câbler `setUmamiUserId` Phase 3 (5 lignes : créer un composant `SortieAnalyticsSessionSync` calqué sur celui de CoList et le mounter dans `(sortie)/layout.tsx`). Sans ça, R1 / R3 restent inmesurables et la Phase 4 du dashboard manquera son top-row de KPIs.

### 8.5 Référence — viralité (K-factor)

K-factor = `(RSVPs reçus + nouvelles créations déclenchées) / sortie publiée`. Levier #1 Sortie.

> ⚠️ Limite RGPD-friendly : aujourd'hui aucun event ne porte d'`outing_id` (PII concern). On ne peut donc pas calculer un vrai K-factor par sortie individuelle. **Approximation grossière acceptable** : ratios agrégés sur la fenêtre. Pour un K par sortie, on aurait besoin d'un id anonymisé/hashé — décision à prendre Phase 3 (cf. §8.7).

| #   | Question actionnable                                          | Event qui répond                                                                       | Métrique               | Seuil d'alerte                                                      | État Phase 1                                                                                      |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| K1  | K-factor agrégé : combien de RSVPs par sortie publiée ?       | `outing_rsvp_set` count / `wizard_publish_succeeded` count                             | ratio sur fenêtre      | `K < 2` = peu viral ; `K ≥ 5` = excellent                           | **OK** dérivable des counts existants ; à calculer Phase 4                                        |
| K2  | Quel canal de partage convertit le mieux en RSVP ?            | `outing_share_clicked.channel` croisé avec `outing_rsvp_set` (corrélation par session) | rsvp_rate par channel  | différentiel > 3× entre channels = focaliser sur le best            | **🟡 PARTIEL** — channels lus mais pas de corrélation ; faisable côté client (session id) Phase 3 |
| K3  | Combien de RSVPs donnent un email (input pour signup futur) ? | `outing_rsvp_set.has_email`                                                            | taux capture email     | `< 30%` = pipeline signup post-RSVP cassé                           | **🔴 GAP** — propriété émise non lue ; à exposer Phase 3                                          |
| K4  | Combien d'invitations RSVP convertissent en signup créateur ? | `outing_rsvp_set` → `auth_signup_completed` (même session)                             | conversion RSVP→signup | `< 5%` = la page RSVP ne pousse pas vers signup                     | **🔴 GAP** — `auth_signup_completed` à ajouter                                                    |
| K5  | Les `delta=switched` (yes/no/yes) sont-ils nombreux ?         | `outing_rsvp_set.delta`                                                                | part de switched       | `> 15%` = friction RSVP (sheet confuse, deadline floue)             | **🔴 GAP** — propriété émise non lue                                                              |
| K6  | Les billets externes / .ics sont-ils utilisés ?               | `outing_ticket_clicked`, `outing_ics_downloaded`                                       | clics par vue sortie   | `outing_ics / outing_viewed < 5%` = save-to-calendar pas découverte | **🔴 BUG** — events définis mais **0 call-site** ; Phase 3 = câbler les onClick avant tout        |

### 8.6 Synthèse — priorités Phase 3 dérivées du cadre

Classement par valeur produit × coût d'implémentation :

**🔴 P0 — bloquants AAARRR (à faire d'abord)** :

1. **Câbler `setUmamiUserId` sur Sortie** (5 lignes) → débloque R1, R3, K2, K4. Sans ça la moitié du dashboard reste vide.
2. **Instrumenter `SortieAuthForm`** (events `auth_signin_started`, `auth_signin_succeeded`, `auth_signin_failed`, `auth_signup_completed`, `magic_link_request`) → débloque Ac6, K4.
3. **Câbler `outing_ticket_clicked` et `outing_ics_downloaded`** dans les composants concernés (probablement `outing-hero` ou un bouton dédié) → débloque K6, et désamorce un bug latent.

**🟡 P1 — exposer dans dashboard, sans nouveau tracking** (lecture pure dans `wizard-umami-stats.ts`) : 4. `outing_viewed.source` → A3. 5. `wizard_publish_failed.reason` → Ac4 (urgent : alerte bug serveur). 6. `wizard_abandoned.last_step` → Ac3. 7. `outing_rsvp_set.has_email` + `.delta` → K3, K5. 8. `landing_v2_view` + `landing_section_visible` + `landing_cta_click` → A4, Ac1. 9. `wizard_publish_succeeded` propriétés (mode, has_venue, has_ticket_url, etc.) → segmentation des sorties créées (utile pour Phase 4 « opportunités »).

**🟢 P2 — affinements** : 10. Décider d'un `outing_id` anonymisé (hash) sur les events `outing_*` → permet K1 par sortie au lieu d'agrégé. Coût : ajouter un hash côté serveur dans le slug → propriété stable mais non-PII. 11. Investiguer doublons de fichiers `demo-interactive` × 2 et `faq` × 2 (CoList) — si Sortie est seul scope priority → reporter à un cleanup CoList ultérieur.

### 8.7 Questions ouvertes pour validation owner avant Phase 3

1. **`auth_signup_completed`** : on l'émet uniquement après vérif email (compte `emailVerified=true`) ou dès création ? Recommandation : **après vérif email** pour ne pas gonfler de comptes morts.
2. **`outing_id` anonymisé** : OK pour ajouter un hash stable (sha256 du slug + salt env) sur les events `outing_*` ? Sinon K-factor reste agrégé seulement (acceptable au début).
3. **Seuils d'alerte** : les valeurs proposées sont des points de départ. Recalibrage prévu après 4 semaines de mesure ?
4. **Périmètre P0/P1** : OK pour traiter les 3 P0 d'abord en un PR, puis P1 en un 2ᵉ PR (lecture-seule du dashboard) ? Ça séparerait clairement « ajout de tracking » et « affichage ».

---

_Fin du rapport — Phase 2 livrée ; Phase 3 démarrera après validation owner des questions §8.7 et après reviews croisées (Plan agent + expert produit/analytics + devil's advocate) demandées par le plan original._
