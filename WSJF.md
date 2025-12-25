# Analyse et Priorisation WSJF des Tâches Nawel

Voici une analyse des tâches proposées en utilisant la méthode **WSJF (Weighted Shortest Job First)** pour prioriser le développement.

La formule utilisée est : `WSJF = (Valeur Business + Criticité Temporelle + Réduction Risque/Opportunité) / Taille du Job`

## Légende des Scores (Estimation relative 1-20)

- **BV (Business Value)**: Valeur pour l'utilisateur ou le business.
- **TC (Time Criticality)**: Urgence, y a-t-il une deadline ou un coût à attendre ?
- **RR (Risk Reduction / Opp. Enablement)**: Sécurité, dette technique, ouvre de nouvelles possibilités.
- **Size**: Estimation de la complexité/effort (plus c'est petit, mieux c'est).

## Classement Prioritaire (Score WSJF décroissant)

| Rang   | ID  | Tâche                                             | BV  | TC  | RR  | Size | Score WSJF | Justification                                                                                                               |
| :----- | :-- | :------------------------------------------------ | :-- | :-- | :-- | :--- | :--------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **1**  | 2   | **Restreindre IA aux utilisateurs vérifiés**      | 8   | 13  | 8   | 3    | **9.6**    | _Rapide à faire une fois l'auth en place. Contrôle les coûts (OpenRouter) et la sécurité._                                  |
| **2**  | 9   | **Gérer les cas d'erreur IA (vide)**              | 5   | 5   | 5   | 2    | **7.5**    | _Quick win pour l'UX. Évite la frustration immédiate._                                                                      |
| **3**  | 13  | **Vérifier système de log**                       | 2   | 2   | 3   | 1    | **7.0**    | _Maintenance. À faire "au fil de l'eau" ou si problème avéré._                                                              |
| **4**  | 15  | **Convives lors de la création d'event**          | 8   | 5   | 3   | 3    | **5.3**    | _Amélioration UX simple mais logique pour le flow de création._                                                             |
| **5**  | 6   | **Préciser Adultes / Enfants**                    | 8   | 5   | 3   | 3    | **5.3**    | _Affinement rapide du point #4. Utile pour les calculs de boissons/quantités._                                              |
| **6**  | 10  | **Feedback utilisateurs sur ingrédients**         | 5   | 3   | 8   | 3    | **5.3**    | _Amélioration de la qualité des données (crowdsourcing). Facile à implémenter._                                             |
| **7**  | 4   | **Nombre de convives (Repas -> Service -> Item)** | 13  | 8   | 5   | 5    | **5.2**    | _Cœur du métier de l'app (planification). Impacte la logique de calcul des quantités._                                      |
| **8**  | 14  | **Création Event en 2 étapes**                    | 8   | 5   | 2   | 3    | **5.0**    | _Amélioration UX. Réduit les erreurs de création._                                                                          |
| **9**  | 12  | **Logger les requêtes IA**                        | 5   | 3   | 5   | 3    | **4.3**    | _Important pour monitorer les coûts et la performance._                                                                     |
| **10** | 5   | **Suggestion de vins (IA)**                       | 13  | 3   | 5   | 5    | **4.2**    | _Fonctionnalité "Wow effect". Pas critique mais forte valeur percue._                                                       |
| **11** | 1   | **Système d'authentification (Better Auth)**      | 20  | 20  | 13  | 13   | **4.1**    | _Bloquant pour presque toutes les autres fonctionnalités personnalisées (listes, accès IA, etc.). Fondamental mais "gros"._ |
| **12** | 11  | **Page Admin : Gestion Cache Recettes**           | 3   | 2   | 5   | 3    | **3.3**    | _Outil interne. Utile pour le debug/coût mais invisible pour l'utilisateur final._                                          |
| **13** | 3   | **Liste des courses par utilisateur**             | 13  | 5   | 5   | 8    | **2.9**    | _Forte valeur utilisateur, mais demande l'Auth d'abord et un peu de logique backend._                                       |
| **14** | 7   | **Résumé des comptes / Remboursements**           | 13  | 3   | 5   | 13   | **1.6**    | _Gros morceau (logique complexe). Très utile mais peut attendre la v2._                                                     |
| **15** | 8   | **Passer en Full API (Mobile)**                   | 8   | 2   | 20  | 20   | **1.5**    | _Enabler énorme pour le futur (App Mobile), mais c'est un très gros chantier (Refonte)._                                    |

> **Note**: Les scores WSJF favorisent les tâches courtes à forte valeur (Quick Wins). Bien que l'auth (#1) ait un score moyen, elle est un **pré-requis technique** pour la plupart des autres tâches à forte valeur.

## Analyse & Suggestions Supplémentaires

### Points forts de la liste

- Couvre bien les aspects fonctionnels (courses, comptes, convives).
- Bonne conscience des coûts/risques IA (logs, cache, restriction d'accès).

### Suggestions d'ajouts (Manquants ?)

1.  **Droit à l'oubli / Suppression de compte** (RGPD) : Si on ajoute l'Auth et les emails, il faut légalement permettre à l'utilisateur de supprimer ses données.
2.  **Performance / Optimisation Images** : Si l'app grossit (photos de plats ?), prévoir de gérer l'optimisation.
3.  **Tests E2E (End-to-End)** : Ajouter un item pour mettre en place Cypress ou Playwright, surtout avant de toucher au "gros" morceau des comptes (#7) ou de l'API (#8), pour éviter les régressions.
4.  **Gestion des unités** : Pour la liste de courses, s'assurer que "grams", "g", "kg" s'additionnent correctement. (Peut-être déjà géré ?).

### Recommandation d'ordre d'exécution

1.  **Fondations** : #1 (Auth), #12 (Logs IA), #13 (Verif Logs).
2.  **Hygienne & Sécurité** : #2 (Lock IA), #9 (Err IA).
3.  **Héritage de données** : #4 (Convives), #6 (Adultes/Enfants), #15 (Creation), #14 (UX Creation).
4.  **Fonctionnalités Core** : #3 (Courses Perso), #5 (Vins), #10 (Feedback).
5.  **Avancé / V2** : #7 (Comptes), #8 (Full API), #11 (Admin Cache).
