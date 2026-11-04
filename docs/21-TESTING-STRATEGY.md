# 21 — Stratégie de tests

## Pyramide
| Niveau | Outil | Portée | Cible |
|---|---|---|---|
| Unitaires | Vitest | `lib/`, parseur de références, schémas Zod, **policies** (matrice complète), formatteurs | < 30 s |
| Composants | Vitest + RTL + jsdom | Composants métier : rendu, interactions, états, a11y de base | |
| Intégration | Vitest + PostgreSQL réel (conteneur de test) | Services + repositories : visibilité, blocages, isolation communautés, transactions | Base recréée par fichier via template DB |
| E2E | Playwright (Chromium + WebKit mobile) | Parcours critiques, permissions, axe | < 10 min en CI |
| Performance | Lighthouse CI | `/`, lecteur, prières | Budgets de [29](29-PERFORMANCE.md) |
| Charge | k6 | Phase 8 | |

**Pas de mock de Prisma** dans les tests d'intégration : on teste contre PostgreSQL. Les mocks sont réservés aux
frontières externes (SMTP, S3 en unitaires, horloge).

## Tests de permissions (obligatoires)
- Un test paramétré parcourt **chaque cellule** de la matrice rôle × permission de
  [ADMIN-ROLES-PERMISSIONS](admin/ADMIN-ROLES-PERMISSIONS.md) et vérifie `authorize()`.
- Tests d'intégration « négatifs » pour chaque service sensible : un `MEMBER` appelle une action admin → `FORBIDDEN` ;
  un responsable de A agit sur B → `NOT_FOUND` ; un utilisateur bloqué → `NOT_FOUND`.
- E2E : accès direct par URL à `/admin/*` et `/manage/<autre>` → 404.

## Parcours E2E du MVP
1. Inscription → email (Mailpit API) → vérification → onboarding
2. Connexion, déconnexion, reset
3. Lecture Jean 3, navigation vers Actes 1, réglage de police persistant
4. Recherche « grace » et « "bon berger" »
5. Surligner Jean 3:16, ajouter une note, la retrouver
6. Publication avec verset + image ; commentaire ; réaction
7. Création de communauté privée ; demande d'adhésion ; approbation dans `/manage`
8. Demande de prière communauté, anonyme ; vérification d'invisibilité pour un non-membre
9. Admin : suspendre un utilisateur (MFA), vérifier l'audit log
10. Modération : signaler un post, le traiter, vérifier la notification
11. Élévation de privilège : ADMIN tente de créer un SUPER_ADMIN → refus

## Données de test
Factories typées (`tests/factories`) ; seed de dev avec données marquées **« Démo »** (préfixe `[Démo]`, flag `isDemo`).
Jamais de données réelles d'utilisateurs en dev ou en test. Le texte biblique de test : extrait LSG (Jean, Psaumes) pour la vitesse.

## Règles CI
Une PR ne fusionne pas si : lint, typecheck, unitaires, intégration ou E2E échouent ; couverture des `policy.ts` < 100 % des
branches ; violation axe `serious`+ ; budget de bundle dépassé.
