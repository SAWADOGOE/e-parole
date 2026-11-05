-- DropIndex
DROP INDEX "profile_display_name_trgm_idx";

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "reauthenticatedAt" TIMESTAMP(3);
