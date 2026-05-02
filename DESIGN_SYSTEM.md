# Design System - Nawel

Ce document décrit le système de design utilisé dans l'application Nawel.

## Design Tokens

### Espacements (Spacing)

Utilisez l'échelle d'espacement standardisée pour maintenir la cohérence :

- `xs`: 0.5rem (8px)
- `sm`: 0.75rem (12px)
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)
- `2xl`: 3rem (48px)
- `3xl`: 4rem (64px)

**Exemple d'utilisation :**

```tsx
<div className="gap-4 p-5 sm:p-6"> {/* gap-lg, padding-md/lg */}
```

### Border Radius

- **Cards/Containers**: `rounded-2xl` (24px)
- **Buttons**: `rounded-full` pour premium, `rounded-xl` pour standard
- **Small elements**: `rounded-lg` (12px)
- **Icons/Avatars**: `rounded-full`

### Ombres (Shadows)

- `shadow-sm`: Ombres légères pour les éléments subtils
- `shadow-md`: Ombres standard pour les cartes
- `shadow-lg`: Ombres importantes pour les éléments en avant-plan
- `shadow-xl`: Ombres très importantes pour les modals
- `shadow-accent`: Ombre avec couleur accent
- `shadow-accent-lg`: Ombre accent plus prononcée

### Transitions

- **Micro-interactions**: `duration-150` (150ms)
- **Standard**: `duration-300` (300ms)
- **Complexe**: `duration-500` (500ms)
- **Page transitions**: `duration-800` (800ms)

**Toujours utiliser `transition-all duration-300` pour les interactions standard.**

### Motion Vocabulary (Sortie)

Aligné Material 3 + Apple HIG. Trois durées + deux courbes d'easing,
plus une règle non-négociable sur `prefers-reduced-motion`.

| Token               | Durée | Easing                            | Usage                                             |
| ------------------- | ----- | --------------------------------- | ------------------------------------------------- |
| `motion-tap`        | 100ms | `ease-out`                        | Feedback tactile (`active:scale-*`)               |
| `motion-standard`   | 250ms | `cubic-bezier(0.2, 0, 0, 1)`      | Hover, color, opacity, transitions UI courantes   |
| `motion-emphasized` | 400ms | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Entrées d'éléments, changements d'état importants |

Disponibles via Tailwind :

```tsx
<div className="duration-motion-standard ease-motion-standard">
<div className="duration-motion-emphasized ease-motion-emphasized">
```

**Tap feedback** — deux registres valides selon l'élément :

| Élément                   | Scale                             | Pourquoi                                                 |
| ------------------------- | --------------------------------- | -------------------------------------------------------- |
| Bouton (CTA, chip, FAB)   | `motion-safe:active:scale-95`     | Feedback affirmé sur un élément où on s'attend à appuyer |
| Carte tappable, lien-bloc | `motion-safe:active:scale-[0.98]` | Feedback discret, la carte n'est pas un bouton           |
| Hero / large container    | `motion-safe:active:scale-[0.99]` | Quasi-imperceptible, juste un signe que c'est interactif |

**Toujours `motion-safe:` en préfixe** — sinon l'animation ignore
la préférence système.

**Reduced motion** : WCAG 2.3.3. Toute animation non-essentielle
doit utiliser le préfixe `motion-safe:` (ex: `motion-safe:animate-in`)
ou s'effondrer à ≤ 80ms. Tailwind ships `motion-safe:` et
`motion-reduce:` variants.

```tsx
{
  /* ✅ animation respecte la préférence système */
}
<div className="motion-safe:animate-in motion-safe:fade-in" />;

{
  /* ❌ animation systématique, ignore l'utilisateur */
}
<div className="animate-in fade-in" />;
```

**Quand animer** :

- ✅ Entrée d'une nouvelle liste (stagger)
- ✅ Feedback de tap (instant, < 150ms)
- ✅ Changement d'état important (succès d'upload, RSVP envoyé)
- ✅ Navigation entre routes (View Transitions API)
- ❌ Décoration pure (logo qui pulse, gradient animé sans raison)
- ❌ Texte qui apparaît lettre par lettre
- ❌ Tout ce qui dépasse 600ms sur du contenu utilitaire

### Typographie

#### Font Weights

- **Headers (H1)**: `font-black` (900)
- **Subheaders (H2)**: `font-bold` (700)
- **Body emphasis**: `font-semibold` (600)
- **Body text**: `font-medium` (500)
- **Small text**: `font-normal` (400)

#### Font Sizes

- **H1**: `text-2xl sm:text-3xl` (24-30px)
- **H2**: `text-xl sm:text-2xl` (20-24px)
- **H3**: `text-lg sm:text-xl` (18-20px)
- **Body**: `text-base sm:text-lg` (16-18px)
- **Small**: `text-sm` (14px)
- **Tiny**: `text-xs` (12px) - utiliser avec parcimonie

### Couleurs

#### Couleur d'accent

La couleur d'accent par défaut est maintenant un violet vibrant (`280 75% 65%`) pour une meilleure visibilité.

#### Couleurs sémantiques

- **Success**: `hsl(142 76% 36%)` - Vert
- **Warning**: `hsl(38 92% 50%)` - Jaune/Amber
- **Error**: `hsl(0 84% 60%)` - Rouge
- **Info**: `hsl(217 91% 60%)` - Bleu

**Utilisation :**

```tsx
<div className="bg-success text-success-foreground">
<div className="bg-warning text-warning-foreground">
```

### Touch Targets

**Minimum**: 44x44px sur mobile pour une accessibilité optimale.

Utilisez `h-11` (44px) minimum pour les boutons sur mobile, `h-10` (40px) sur desktop.

## Accessibilité

### Focus States

Tous les éléments interactifs doivent avoir un état de focus visible :

```tsx
className =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2";
```

### ARIA Labels

- Tous les boutons icon-only doivent avoir un `aria-label`
- Les icônes décoratives doivent avoir `aria-hidden="true"`
- Utilisez `role="tablist"` et `role="tab"` pour les barres d'onglets

### Contrastes

- Texte sur fond clair : minimum 4.5:1 (WCAG AA)
- Texte sur fond sombre : minimum 4.5:1
- Éléments UI : minimum 3:1

## Composants Standards

### Button Premium

```tsx
<Button
  variant="premium"
  className="h-11 w-full rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent/50"
  icon={<Icon />}
  aria-label="Action"
>
  Texte
</Button>
```

### Cards

```tsx
<div className="rounded-2xl border border-white/40 bg-white/90 p-5 shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg sm:p-6">
```

### Item Rows

```tsx
<button className="flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent/50">
```

## Bonnes Pratiques

1. **Espacements cohérents** : Utilisez toujours l'échelle standardisée
2. **Transitions fluides** : `duration-300` pour la plupart des interactions
3. **Focus visible** : Toujours ajouter les états de focus
4. **Touch targets** : Minimum 44px sur mobile
5. **Contrastes** : Vérifier avec un outil d'accessibilité
6. **ARIA** : Labeliser tous les éléments interactifs

## Migration

Pour migrer un composant existant :

1. Remplacer les espacements arbitraires par l'échelle standardisée
2. Standardiser les `border-radius` (utiliser `rounded-2xl` pour les cartes)
3. Ajouter `duration-300` aux transitions
4. Ajouter les états de focus
5. Ajouter les `aria-label` manquants
6. Améliorer les contrastes de couleurs
