# Outils d'Internationalisation (i18n)

Ce dossier contient des outils pour maintenir la cohérence des traductions dans Nawel.

## Scripts disponibles

### 1. Vérification de cohérence

Vérifie que toutes les langues ont les mêmes clés et qu'aucune n'est vide.

```bash
node scripts/i18n/verify.mjs
```

### 2. Extraction des clés du code

Scanne le dossier `src/` pour trouver des clés `t("...")` qui ne sont pas encore définies dans les fichiers de traduction.

```bash
node scripts/i18n/extract.mjs
```

---

## Instructions pour Antigravity (IA)

Lorsque tu veux que je vérifie ou mette à jour les traductions, tu peux me dire :

> **"Antigravity, vérifie la traduction avec @scripts/i18n/verify.mjs"**
> _Je lancerai le script de cohérence et je corrigerai les manques._

> **"Antigravity, cherche les clés oubliées avec @scripts/i18n/extract.mjs"**
> _Je scannerai le code pour trouver ce qui manque dans les JSON._

---

## Fonctionnement technique

Ces scripts fonctionnent de manière autonome en Node.js et n'ont pas de dépendances externes (uniquement `fs` et `path`).
Elles se basent sur les fichiers JSON situés dans `./messages`.
