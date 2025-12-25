# Roadmap Technique & Priorités (WSJF)

Ce fichier liste les tâches par ordre de priorité pour le développement.
Chaque ligne inclut une "Hint" technique pour guider l'implémentation par l'IA.

## ✅ Tâches Terminées

| ID    | Tâche                          | Note                                               |
| :---- | :----------------------------- | :------------------------------------------------- |
| **1** | **Système d'authentification** | _Better Auth implémenté. Sessions fonctionnelles._ |

---

## 🚀 Backlog Prioritaire (À faire)

| Prio   | ID     | Tâche                                        | BV  | Tech Hint (Instructions pour l'IA)                                                                                                                         |
| :----- | :----- | :------------------------------------------- | :-- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **2**  | **Restreindre IA aux utilisateurs vérifiés** | 9.6 | Dans `lib/openrouter.ts`, ajouter un check `session` + `emailVerified` avant l'appel API. Renvoyer une erreur 403 si KO. Cacher bouton IA si pas connecté. |
| **2**  | **9**  | **Gérer les cas d'erreur IA (réponse vide)** | 7.5 | Dans le `Server Action` IA, `try/catch`. Si réponse vide/null, ne pas crash, retourner `{success: false}`. UI: Afficher `SuccessToast` type error.         |
| **3**  | **13** | **Vérifier système de log**                  | 7.0 | Vérifier `lib/logger.ts`. S'assurer que les logs partent bien dans la console (ou service externe si configuré) en Prod.                                   |
| **4**  | **15** | **Convives lors de la création d'event**     | 5.3 | `components/create-event-form.tsx`: Ajouter champ `guests` (number). Mettre à jour `schema.ts` (table events) et `action` de création.                     |
| **5**  | **6**  | **Préciser Adultes / Enfants**               | 5.3 | `schema.ts`: scinder `guests` en `adults` et `children`. UI: Inputs séparés. Mettre à jour le calcul du total.                                             |
| **6**  | **10** | **Feedback utilisateurs sur ingrédients**    | 5.3 | Créer table `IngredientFeedback`. UI: Icone "Flag" sur une row ingrédient -> Modal raison -> Server Action `reportIngredient`.                             |
| **7**  | **4**  | **Logique de calcul Convives**               | 5.2 | Cascade : Event `guests` -> Default Meal `guests`. Si Meal modifié -> Service `guests`. Si Service modifié -> Item `quantity` (si par pers).               |
| **8**  | **14** | **Création Event en 2 étapes**               | 5.0 | Refactor `CreateEventModal`. Step 1: Nom/Date/Lieu. Step 2: Options (Admin Key, Import). Bouton "Suivant" puis "Valider".                                  |
| **9**  | **12** | **Logger les requêtes IA**                   | 4.3 | `schema.ts`: Table `AiRequestLogs` (prompt, response, user_id, cost, tokens). `lib/openrouter.ts`: Insert après chaque appel.                              |
| **10** | **5**  | **Suggestion de vins (IA)**                  | 4.2 | `ai-actions.ts`: Nouvelle fonction `suggestWine(mealContext)`. Prompt: "Suggère 3 vins pour ce menu...". UI: Afficher suggestions sous le menu.            |
| **11** | **16** | **Tests E2E (Cypress/Playwright)**           | 4.6 | Installer Playwright. Créer test: Login -> Create Event -> Add Meal. Vérifier que ça ne casse pas sur une PR.                                              |
| **12** | **17** | **Profil Utilisateur / RGPD**                | 3.2 | Page `/profile`. Formulaire update `name`/`image`. Zone danger: "Supprimer mon compte" -> Action `deleteUser` (cascade delete events?).                    |
| **13** | **3**  | **Liste des courses par utilisateur**        | 2.9 | `schema.ts`: Table `UserShoppingList` (relation Item). UI: Bouton "Ajouter à ma liste". Page `/shopping-list`.                                             |
| **14** | **11** | **Page Admin : Cache Recettes**              | 3.3 | Page `/admin/cache`. Table des `CachedRecipes`. Actions: Voir détails, Delete (invalider cache).                                                           |
| **15** | **7**  | **Résumé des comptes / Remboursements**      | 1.6 | `schema.ts`: `Expenses` (who, amount, event). Algo "Minimiser les transactions". UI: Tableau "Qui doit combien à qui".                                     |
| **16** | **8**  | **Passer en Full API (Mobile)**              | 1.5 | Refactor Server Actions -> Route Handlers (`app/api/...`). Préparer pour React Native / Flutter.                                                           |

> **Note**: BV = Business Value. L'ordre est déterminé par le score WSJF (Valeur / Effort).
