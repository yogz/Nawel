# COLIST_ANALYTICS.md

Stratégie analytics de l'app **CoList** (`colist.fr`). Pendant de `ANALYTICS_AUDIT.md`,
qui reste dédié à **Sortie**. Les deux apps sont **séparées dans Umami** (deux website IDs
distincts) — ne pas mélanger.

- CoList → website ID `383d4d2b-6e94-4215-b02e-39ddc800134b` (script dans `(colist)/[locale]/layout.tsx`)
- Sortie → website ID `76add338-…` (ne pas toucher ici)

Umami est en **tier gratuit → pas d'API**. On lit les chiffres à la main sur `cloud.umami.is`.

---

## North-star

> **Nombre d'événements où au moins un invité a contribué** — c'est le signal que le produit
> rend un vrai service collectif (pas juste une liste créée puis abandonnée) ET qu'il se propage
> au-delà de l'hôte.

---

## 5 KPIs (cadre AAARRR-lite)

Chaque event de la page événement porte désormais une dimension **`role` (host|guest)** et
**`event_slug`** → on peut filtrer/segmenter dans Umami.

| #   | Étape                    | KPI                                                                                   | Comment le lire dans Umami                          | Cible                             |
| --- | ------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| 1   | **Acquisition**          | Visiteurs uniques landing + taux de clic CTA                                          | Visitors (vue site) ; event `cta_click` / visiteurs | _à fixer après lecture dashboard_ |
| 2   | **Activation (hôte)**    | Taux de création : `event_created` / visiteurs uniques                                | event `event_created` ÷ Visitors                    | _à fixer_                         |
| 3   | **Référence / viralité** | `guest_joined` par événement créé                                                     | event `guest_joined` ÷ `event_created`              | _à fixer_                         |
| 4   | **Engagement invité**    | Taux d'activation invité : `guest_first_contribution` / `guest_joined` ; + `rsvp_set` | ratio des deux events                               | _à fixer_                         |
| 5   | **Rétention (hôte)**     | Retour hôte à J+7                                                                     | Umami Retention, segment `role = host`              | _à fixer_                         |

**Le KPI #3 est le moteur de croissance** : il n'était pas mesurable avant l'instrumentation de
la boucle invité (juin 2026). À surveiller en premier une fois du volume accumulé.

> Cibles chiffrées : à poser après une première lecture du dashboard `cloud.umami.is` (volumes
> réels). Tant que < ~200 sessions/sem, lire en absolu (pas en %), comme pour Sortie.

---

## Inventaire des événements

### Acquisition / landing

`cta_click` (location: hero|footer|sticky_mobile), `discover_click`, `feature_viewed`,
`demo_viewed`, `demo_step`, `faq_interaction`, `landing_variant_assigned`. Pageviews auto par Umami.

### Auth

`login` (method), `sign_up` (method), `magic_link_request`, `forgot_password_request`,
`auth_mode_toggle`, `auth_method_toggle`, `auth_error`.

### Création

`event_created`.

### Page événement — **portent `role` + `event_slug`**

- Navigation : `tab_changed`
- Articles : `item_created|updated|deleted|assigned|moved`, `drag_drop_used`, `shopping_item_checked`
- Repas/services : `meal_created|updated|deleted`, `service_created|updated|deleted`
- Personnes : `person_created|updated|deleted`
- Partage : `share_opened`, `share_link_copied`
- IA : `ai_ingredients_generated`, `ai_ingredients_generated_batch`
- **Boucle invité (juin 2026)** :
  - `guest_joined` (method: `guest_access` | `claimed` | `new`) — un invité rejoint, **1×/événement/device**
  - `guest_first_contribution` — 1ʳᵉ contribution d'un invité, **1×/événement/device**
  - `rsvp_set` (label: confirmed|declined|maybe), `guest_count_set` (value: nb accompagnants)

### Technique

`exception`, `performance_timing`, `app_error`, `react_error_boundary`.

---

## Convention de nommage

- `snake_case`, verbe au passé pour une action accomplie (`event_created`, `guest_joined`).
- Passer par les helpers de `src/lib/analytics.ts` (et **pas** `sendGAEvent` en direct) : ils
  héritent du contexte `role`/`event_slug`, de la garde consentement et de la garde dev.
- Détails métier en **propriétés** (`method`, `location`, `label`, `value`), pas dans le nom.
- Le contexte par événement est posé dans `event-planner.tsx` via `setAnalyticsContext`.

---

## Consentement (RGPD)

La bannière (`components/common/cookie-consent.tsx`) est **désactivée** : tracking actif par défaut
(`hasConsent = true`), désactivable via `localStorage.analytics_consent = "false"`. Tracking
cookieless (Umami). Posture à trancher séparément si besoin d'un opt-in strict.

---

## Debug

`localStorage.analytics_debug = "true"` → les events sont loggés en console au lieu d'être envoyés
(utile pour vérifier `role` et la boucle invité sans polluer la prod).
