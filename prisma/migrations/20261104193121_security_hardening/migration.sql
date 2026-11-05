-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actorId_fkey";

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "mfaVerifiedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Durcissement des droits du rôle applicatif (audit de sécurité Phase 1)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_app') THEN
    -- Suppression des comptes : logique (deletedAt) ; la purge physique passera par un job dédié avec le rôle propriétaire.
    REVOKE DELETE, TRUNCATE ON "user" FROM eparole_app;
    -- L'application n'a pas à modifier l'historique des migrations.
    -- Absente de la base fantôme de `prisma migrate dev` : sans ce test, la commande échouait.
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
      REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "_prisma_migrations" FROM eparole_app;
    END IF;
  END IF;
END
$$;
