---
name: eparole-admin
description: Use when building any e-Parole back-office screen or action under /admin - dashboard KPIs, user management, communities, churches, editorial CMS, Bible administration, settings, feature flags, audit log - or the admin shell (sidebar, breadcrumbs, data tables, charts).
---

# e-Parole — back-office `/admin`

## Instructions
1. Lire `docs/admin/ADMIN-OVERVIEW.md`, `ADMIN-ARCHITECTURE.md` et le document de l'écran concerné.
2. Layout `(admin)/admin/layout.tsx` : `requireAdminActor()` (rôle global + MFA) → sinon `notFound()`. Ce n'est **pas** la sécurité :
   chaque action utilise `adminAction({ permission, schema, requireRecentAuth, audit, handler })`.
3. Garde de hiérarchie : jamais d'action sur un compte de rôle ≥ au sien ; jamais d'auto-attribution.
4. Actions destructives : `AlertDialog` avec conséquence explicite, saisie du @handle pour suspension/bannissement, motif obligatoire.
5. Audit dans la même transaction que l'action ; `metadata` sans contenu sensible.
6. Tables : `DataTable` (TanStack Table 9 — vérifier l'API v9), pagination/tri/filtres côté serveur via `searchParams` validés Zod,
   état vide, skeleton de lignes, version liste sous `md`.
7. Dashboard : valeurs réelles uniquement (vues matérialisées), état vide si pas de donnée, badge « Démo » pour le seed,
   seuil k ≥ 5 pour les agrégats.
8. PII masquées par défaut ; révélation explicite auditée (`user.pii.reveal`).
9. Pas d'écran listant librement les prières, messages ou notes ; accès aux contenus via dossiers de modération.
10. Identité : même tokens, sidebar `--brand`, densité `text-sm`, chiffres tabulaires.

## Vérifications
- [ ] Test : `MEMBER` appelant directement la Server Action → refus
- [ ] Test : `ADMIN` → `role:grant:super_admin` refusé
- [ ] Entrée d'audit vérifiée par test
- [ ] Aucune donnée fictive présentée comme réelle

## Références
`docs/admin/*`, skill `eparole-rbac`, skill `eparole-moderation`.
