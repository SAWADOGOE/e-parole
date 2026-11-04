---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "tests/**"
  - "e2e/**"
---

# Tests

- Unitaires Vitest pour le pur, tests paramétrés pour la matrice de permissions, RTL pour les composants,
  intégration sur PostgreSQL réel pour services et repositories, Playwright + axe pour les parcours.
- Écrire les tests négatifs d'autorisation et de visibilité dès le départ (auteur, abonné, membre, non-membre, bloqué,
  déconnecté, responsable, admin).
- Ne mocker ni Prisma ni le module testé ; mocks pour SMTP, S3 unitaire, horloge.
- Sélecteurs E2E par rôle et label ; axe sur chaque page visitée.
- Factories typées ; aucune donnée réelle ; données de démo marquées.
- Ne jamais désactiver un test pour faire passer la CI ; ne jamais déclarer un test exécuté s'il ne l'a pas été.
