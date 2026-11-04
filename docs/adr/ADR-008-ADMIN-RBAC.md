# ADR-008 — RBAC hybride : rôles en base, permissions en code

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
Deux niveaux d'autorité (plateforme et communauté), un besoin fort d'auditabilité et de tests, peu de besoin de rôles
personnalisés au départ. Le brief proposait des tables `Role`, `Permission`, `UserRole`, `CommunityRole`.

## Options
1. RBAC entièrement en base (rôles et permissions éditables depuis l'admin).
2. **Hybride** : attribution des rôles en base, définition des permissions par rôle en code.
3. ABAC / moteur de politiques externe (Casbin, OPA, Cerbos).

## Décision
Option 2.
- `UserRole(userId, role: GlobalRole)` ; `CommunityMember.role: CommunityRole`.
- `permissions.ts` : matrice typée `permission → rôles autorisés + restriction (propre, plafond de durée, hiérarchie)`.
- `authorize(actor, permission, resource?)` combine : statut du compte, rôles globaux, rôle local dans la communauté de la
  ressource, propriété, hiérarchie. Lève `FORBIDDEN`/`NOT_FOUND`.
- Badges (pasteur, responsable, enseignant) séparés des rôles, sans permission.
- La matrice de [ADMIN-ROLES-PERMISSIONS](../admin/ADMIN-ROLES-PERMISSIONS.md) est la spécification, vérifiée par test.

## Conséquences
- ➕ Toute évolution de droits passe par une PR revue et testée ; impossible d'élargir des droits en un clic.
- ➕ Typage : une permission inexistante ne compile pas.
- ➖ Pas de rôle personnalisé sans déploiement ; acceptable au MVP. Si le besoin apparaît (Phase 5+), ajout d'une table
  `CustomRole` limitée à des permissions de communauté, via nouvel ADR.
