# Solutions pour les problèmes de focus dans les Drawers

## Problème

Les inputs dans les drawers (surtout sur mobile) peuvent causer des problèmes de focus :

- Le clavier virtuel masque l'input
- Le scroll ne fonctionne pas correctement
- Le focus automatique ne fonctionne pas
- Le viewport ne s'ajuste pas correctement

## Solutions disponibles

### ✅ Solution 1: `DrawerInput` (Recommandé)

Composant Input personnalisé avec gestion automatique du scroll.

**Avantages:**

- Scroll automatique vers l'input au focus
- Compatible avec tous les types d'input
- Gestion du délai pour le clavier virtuel

**Utilisation:**

```tsx
import { DrawerInput } from "@/components/ui/drawer-input";

<DrawerInput
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Entrez votre nom"
  scrollOnFocus={true} // Par défaut: true
  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
/>;
```

### ✅ Solution 2: `DrawerTextareaInput` (Meilleur pour mobile)

Utilise un textarea qui se comporte comme un input. Les textareas sont souvent mieux gérés par les navigateurs mobiles.

**Avantages:**

- Meilleure gestion native sur mobile
- Auto-resize pour simuler un input
- Scroll automatique

**Utilisation:**

```tsx
import { DrawerTextareaInput } from "@/components/ui/drawer-input";

<DrawerTextareaInput
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="votre@email.com"
  rows={1} // Important: garder à 1 pour simuler un input
  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
/>;
```

### ✅ Solution 3: `DrawerNativeInput` (Pour éviter le focus initial)

Input natif avec gestion différée du focus.

**Avantages:**

- Évite les problèmes de focus initial
- Focus différé après ouverture du drawer

**Utilisation:**

```tsx
import { DrawerNativeInput } from "@/components/ui/drawer-input";

<DrawerNativeInput
  value={value}
  onChange={(e) => setValue(e.target.value)}
  preventAutoFocus={false} // true pour désactiver complètement
  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
/>;
```

### ✅ Solution 4: Input standard SANS autoFocus (Le plus simple)

**Utilisation:**

```tsx
import { Input } from "@/components/ui/input";

// ❌ Éviter:
<Input autoFocus />

// ✅ Utiliser:
<Input /> // Pas d'autoFocus

// Ou avec focus manuel:
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (open && inputRef.current) {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300); // Délai pour laisser le drawer s'ouvrir
  }
}, [open]);

<Input ref={inputRef} />
```

## Recommandations par cas d'usage

### Pour un input simple (nom, email, etc.)

→ **Solution 1: `DrawerInput`**

### Pour mobile uniquement

→ **Solution 2: `DrawerTextareaInput`**

### Si vous avez des problèmes de focus initial

→ **Solution 3: `DrawerNativeInput`** ou **Solution 4**

### Pour une solution rapide sans changement de composant

→ **Solution 4: Enlever `autoFocus`**

## Exemple complet dans un drawer

```tsx
"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { DrawerInput } from "@/components/ui/drawer-input";

export function MyDrawer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="px-6">
        <DrawerHeader>
          <DrawerTitle>Modifier le profil</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <DrawerInput
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

## Notes importantes

1. **Le Drawer utilise déjà `repositionInputs={true}`** par défaut (voir `src/components/ui/drawer.tsx`)

2. **Sur mobile**, les textareas sont souvent mieux gérés que les inputs

3. **Évitez `autoFocus`** directement sur les inputs dans les drawers

4. **Utilisez des délais** (100-300ms) pour le focus manuel après ouverture

5. **Testez sur mobile** - les problèmes sont plus visibles sur les appareils tactiles

## Migration depuis Input standard

Remplacez simplement:

```tsx
// Avant
import { Input } from "@/components/ui/input";
<Input value={value} onChange={...} />

// Après
import { DrawerInput } from "@/components/ui/drawer-input";
<DrawerInput value={value} onChange={...} />
```

Les props sont identiques, donc c'est un remplacement direct !
