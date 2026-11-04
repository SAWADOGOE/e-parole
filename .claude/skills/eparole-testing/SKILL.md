---
name: eparole-testing
description: Use when writing or choosing tests for e-Parole - Vitest unit tests, React Testing Library component tests, integration tests against real PostgreSQL, Playwright E2E with axe accessibility checks, permission matrix tests, or test factories and seeds.
---

# e-Parole — tests

## Choisir le niveau
| Code | Niveau |
|---|---|
| Fonction pure (`lib/`, parseur de références, Zod) | Unitaire Vitest |
| `policy.ts`, `permissions.ts` | Unitaire paramétré (chaque cellule de la matrice) |
| Composant métier | Vitest + RTL (rendu, interactions, états vide/erreur, rôles ARIA) |
| Service + repository | Intégration sur PostgreSQL réel (conteneur), base recréée par fichier |
| Parcours utilisateur | Playwright + `@axe-core/playwright` |

## Instructions
1. Lire `docs/21-TESTING-STRATEGY.md`.
2. Écrire le test qui échoue d'abord pour un bug ; pour une fonctionnalité, écrire les tests **négatifs** d'autorisation dès le départ.
3. Ne pas mocker Prisma ni le module testé. Mocks seulement pour SMTP, S3 (en unitaire), horloge.
4. Factories typées dans `tests/factories` ; aucune donnée réelle ; textes bibliques de test issus de LSG (Jean, Psaumes).
5. E2E : sélecteurs par rôle/label (`getByRole`), pas par classes CSS ; emails via l'API Mailpit ; axe sur chaque page visitée.
6. Cas de visibilité systématiques : auteur, abonné, membre, non-membre, bloqué, déconnecté, responsable, admin.
7. Nommer : `it("refuse à un responsable de A de modérer un post de B")`.

## Vérifications
- [ ] `pnpm test` et `pnpm test:integration` verts
- [ ] Nouveaux parcours critiques couverts en E2E
- [ ] Ne jamais déclarer un test exécuté s'il ne l'a pas été

## Références
`docs/21-TESTING-STRATEGY.md`, `docs/06-USER-STORIES.md`.
