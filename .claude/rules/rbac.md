---
paths:
  - "src/server/policies/**"
  - "**/policy.ts"
  - "**/actions.ts"
  - "src/app/api/**"
---

# RBAC

- Rôles globaux : SUPER_ADMIN, ADMIN, MODERATOR, CONTENT_EDITOR (MEMBER implicite). Rôles locaux : OWNER, ADMIN, MODERATOR, MEMBER.
- Permissions définies en code (`permissions.ts`), spécifiées par `docs/admin/ADMIN-ROLES-PERMISSIONS.md` ; changer le doc d'abord, puis le code et le test de matrice.
- `authorize(actor, permission, resource)` côté serveur à chaque action. Masquer un bouton n'est jamais une protection.
- Ordre : statut du compte → visibilité (404) → rôle global/local de la communauté **de la ressource** → restrictions (propre, plafond, hiérarchie, séparation des tâches).
- Pas d'auto-élévation, pas d'action sur un rôle ≥ au sien, pas de retrait du dernier SUPER_ADMIN.
- Badges vérifiés : aucune permission.
- Jamais attribuable : lecture des messages privés, prières privées, notes bibliques, identité d'un auteur anonyme.
- 100 % des branches de policy couvertes par des tests ; revue `security-auditor`.
