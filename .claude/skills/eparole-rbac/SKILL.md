---
name: eparole-rbac
description: Use when adding or changing a permission, a global role (SUPER_ADMIN, ADMIN, MODERATOR, CONTENT_EDITOR, MEMBER), a community role, a verified badge, or any call to authorize() / requireCommunityRole() in e-Parole.
---

# e-Parole — RBAC

## Modèle
Rôles globaux en base (`UserRole`), rôles locaux sur `CommunityMember.role`, **permissions définies en code**
(`src/server/policies/permissions.ts`), spécifiées par `docs/admin/ADMIN-ROLES-PERMISSIONS.md`. Badges = aucune permission.

## Workflow pour changer des droits
1. Modifier d'abord la matrice du document (justification dans la PR).
2. Mettre à jour `permissions.ts` (typé : `as const satisfies PermissionMatrix`).
3. Mettre à jour le test paramétré qui parcourt chaque cellule de la matrice.
4. Ajouter les tests négatifs d'intégration (rôle inférieur, autre communauté, compte suspendu).
5. Revue `security-auditor` obligatoire.

## Règles d'évaluation de `authorize(actor, permission, resource)`
1. Compte `SUSPENDED`/`BANNED` → refus de toute écriture.
2. Ressource invisible pour l'acteur → `NOT_FOUND` (avant tout test de permission).
3. Permission de communauté → rôle local dans la communauté **de la ressource** (pas celle passée par le client).
4. Restriction : propriété (`own`), plafond (suspension ≤ 30 j pour MODERATOR), hiérarchie (rôle cible < rôle acteur),
   séparation des tâches (pas d'approbation de son propre contenu, pas de jugement de son propre appel).
5. Permissions **jamais attribuables** : lecture des messages privés, prières privées, notes bibliques.

## Contraintes
Masquer un bouton n'est jamais une protection ; l'UI peut appeler `can()` pour le confort, le serveur appelle `authorize()`.

## Vérifications
- [ ] Code et document concordent (test)
- [ ] 100 % des branches de `policy.ts` couvertes

## Références
`docs/admin/ADMIN-ROLES-PERMISSIONS.md`, `docs/adr/ADR-008-ADMIN-RBAC.md`.
