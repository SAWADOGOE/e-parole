---
paths:
  - "src/app/(admin)/**"
  - "src/app/(manage)/**"
  - "src/features/administration/**"
  - "src/features/moderation/**"
  - "src/features/editorial/**"
  - "docs/admin/**"
---

# Administration

- Layout admin = confort (404 si pas admin + MFA). La sécurité est dans chaque `adminAction` (permission, hiérarchie, ré-auth, Zod, audit).
- Réponse aux non-autorisés : 404 ; tentative journalisée.
- Actions destructives : conséquence explicite, motif obligatoire, saisie du @handle pour suspension/bannissement.
- Audit dans la même transaction ; `metadata` sans contenu sensible.
- PII masquées par défaut, révélation auditée.
- Aucun écran listant librement prières, messages ou notes ; accès au contenu via dossier de modération uniquement.
- Dashboard : données réelles (vues matérialisées), état vide sinon, badge « Démo » pour le seed, seuil k ≥ 5.
- `/manage` : toujours via `requireCommunityRole` et `CommunityScope`.
- Bibliothèques admin (TanStack Table, Recharts) jamais importées dans l'espace membre.
