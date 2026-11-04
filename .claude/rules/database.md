---
paths:
  - "prisma/**"
  - "**/repository.ts"
  - "src/server/db/**"
  - "scripts/**"
---

# Base de données

- Prisma **7.10.x** épinglé (`prisma@latest` = RC 8, interdit). PostgreSQL 17.
- Ids `cuid(2)` (Int pour les tables Bible), `@@map` snake_case, `createdAt`/`updatedAt`.
- Soft delete seulement sur User, Post, Comment, PrayerRequest, Community, EditorialContent, Message ; filtré dans les repositories.
- Pagination par curseur `(createdAt, id)` ; `take` ≤ 30 (membre), ≤ 100 (admin).
- Repositories communautaires : `CommunityScope` en premier paramètre.
- SQL brut commenté dans les migrations pour FTS, CHECK, index partiels, GRANT/REVOKE.
- Migrations : `migrate dev` en local, `migrate deploy` en CI ; jamais `db push` ; expand → migrate → contract.
- Écriture + audit dans la même transaction.
- Jamais d'écriture applicative sur `bible_verse*` ; `audit_log` append-only.
- Jamais de connexion à une base de production ; tests d'intégration sur PostgreSQL réel, pas de mock Prisma.
