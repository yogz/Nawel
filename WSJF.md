# Roadmap Technique & Priorités (WSJF)

Ce fichier liste les tâches par ordre de priorité pour le développement.
Chaque ligne inclut une "Hint" technique pour guider l'implémentation par l'IA.

## ✅ Tâches Terminées

| ID     | Tâche                                        | Note                                                                  |
| :----- | :------------------------------------------- | :-------------------------------------------------------------------- |
| **1**  | **Système d'authentification**               | _Better Auth implémenté. Sessions fonctionnelles._                    |
| **2**  | **Restreindre IA aux utilisateurs vérifiés** | _Check session dans `ingredient-actions.ts`. Erreur si non connecté._ |
| **9**  | **Gérer les cas d'erreur IA (réponse vide)** | _Retour structuré `{success, error}`. Gestion try/catch._             |
| **15** | **Convives lors de la création d'event**     | _Champs `adults` et `children` ajoutés au formulaire._                |
| **6**  | **Préciser Adultes / Enfants**               | _Colonnes `adults`/`children` dans `events`. UI avec inputs séparés._ |
| **17** | **Profil Utilisateur**                       | _Tiroir de profil avec modification nom, email et avatar implémenté._ |

---

## 🚀 Backlog Prioritaire (À faire)

| Prio   | ID     | Tâche                                     | BV  | Tech Hint (Instructions pour l'IA)                                                                                                  |
| :----- | :----- | :---------------------------------------- | :-- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **13** | **Vérifier système de log**               | 7.0 | Vérifier `lib/logger.ts`. S'assurer que les logs partent bien dans la console (ou service externe si configuré) en Prod.            |
| **2**  | **10** | **Feedback utilisateurs sur ingrédients** | 5.3 | Créer table `IngredientFeedback`. UI: Icone "Flag" sur une row ingrédient -> Modal raison -> Server Action `reportIngredient`.      |
| **3**  | **4**  | **Logique de calcul Convives**            | 5.2 | Cascade : Event `guests` -> Default Meal `guests`. Si Meal modifié -> Service `guests`. Si Service modifié -> Item `quantity`.      |
| **4**  | **14** | **Création Event en 2 étapes**            | 5.0 | Refactor `CreateEventModal`. Step 1: Nom/Date/Lieu. Step 2: Options (Admin Key, Import). Bouton "Suivant" puis "Valider".           |
| **5**  | **12** | **Logger les requêtes IA**                | 4.3 | `schema.ts`: Table `AiRequestLogs` (prompt, response, user_id, cost, tokens). `lib/openrouter.ts`: Insert après chaque appel.       |
| **6**  | **5**  | **Suggestion de vins (IA)**               | 4.2 | `ai-actions.ts`: Nouvelle fonction `suggestWine(mealContext)`. Prompt: "Suggère 3 vins pour ce menu...". UI: Afficher sous le menu. |
| **7**  | **16** | **Tests E2E (Cypress/Playwright)**        | 4.6 | Installer Playwright. Créer test: Login -> Create Event -> Add Meal. Vérifier que ça ne casse pas sur une PR.                       |
| **9**  | **3**  | **Liste des courses par utilisateur**     | 2.9 | `schema.ts`: Table `UserShoppingList` (relation Item). UI: Bouton "Ajouter à ma liste". Page `/shopping-list`.                      |
| **10** | **11** | **Page Admin : Cache Recettes**           | 3.3 | Page `/admin/cache`. Table des `CachedRecipes`. Actions: Voir détails, Delete (invalider cache).                                    |
| **11** | **7**  | **Résumé des comptes / Remboursements**   | 1.6 | `schema.ts`: `Expenses` (who, amount, event). Algo "Minimiser les transactions". UI: Tableau "Qui doit combien à qui".              |
| **12** | **8**  | **Passer en Full API (Mobile)**           | 1.5 | Refactor Server Actions -> Route Handlers (`app/api/...`). Préparer pour React Native / Flutter.                                    |

> **Note**: BV = Business Value. L'ordre est déterminé par le score WSJF (Valeur / Effort).
