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

| #   | Étape                    | KPI                                                        | Baseline (30 j, juin 2026)            | Cible                          |
| --- | ------------------------ | ---------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| 1   | **Acquisition**          | Visiteurs uniques + rebond                                 | 105 visiteurs, rebond 61 %, CTA 6     | rebond < 55 % en pic saison    |
| 2   | **Activation (hôte)**    | `event_created` ÷ visiteurs                                | 4 / 105 ≈ **3,8 %**                   | 6–8 %                          |
| 3   | **Référence / viralité** | `guest_joined` ÷ `event_created`                           | à établir (proxy actuel ≈ 5, cf. bas) | ≥ 3 invités / événement        |
| 4   | **Engagement invité**    | `guest_first_contribution` ÷ `guest_joined` ; + `rsvp_set` | à établir au déploiement              | ≥ 50 % des invités contribuent |
| 5   | **Rétention (hôte)**     | Retour hôte J+7                                            | à établir (segment `role = host`)     | à fixer en pic saison          |

**Le KPI #3 est le moteur de croissance** : non mesurable avant l'instrumentation (juin 2026).
Proxy avant déploiement : `guest_continued_without_auth` (23) ÷ `event_created` (4) ≈ **5 invités
arrivés par événement créé** → la boucle tourne déjà, on va enfin la mesurer précisément.

### Baseline juin 2026 (30 j) — hors saison, faible volume

105 visiteurs / 137 visites / 258 vues. **Trafic en forte baisse (~−80 %) vs les 30 j précédents :
saisonnier** (CoList = repas de fêtes/famille, juin est creux). Re-baseliner en **nov–déc** (pic).

Top events : `service_updated` 193, `item_created` 85, `item_updated` 39 → les rares événements
créés sont **très utilisés** (engagement élevé par événement). Côté boucle : `guest_continued_without_auth`
23, `person_created` 15, `share_link_copied` 6, `event_created` 4.

> ⚠️ **`exception` = 34 (7 % des events, ~13 % des vues)** : taux d'erreurs JS élevé à investiguer
> séparément (Umami ne donne pas le détail — voir Sentry/logs ou reproduire).
> ⚠️ **`service_updated` = 193 mais `service_created` = 0** : à vérifier que l'event ne sur-déclenche
> pas (re-render / frappe) avant de s'y fier comme métrique d'engagement.

> Volumes < ~200 sessions/sem → lire en **absolu**, pas en %, comme pour Sortie.

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
