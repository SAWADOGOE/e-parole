-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('TEXT', 'TESTIMONY', 'QUESTION', 'MEDITATION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('AMEN', 'LOVE', 'ENCOURAGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REACTION', 'COMMENT', 'REPLY', 'MENTION', 'FOLLOW', 'MODERATION', 'REPORT_REVIEWED');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('POST', 'COMMENT', 'PROFILE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE', 'FRAUD_FINANCIAL', 'IMPERSONATION', 'DANGEROUS_LINK', 'SEXUAL', 'SELF_HARM', 'MINOR_SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('DISMISS', 'WARN', 'HIDE', 'REMOVE', 'SUSPEND', 'BAN');

-- CreateEnum
CREATE TYPE "SanctionKind" AS ENUM ('WARNING', 'SUSPENSION', 'BAN');

-- AlterEnum
ALTER TYPE "MediaStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "media_asset" ADD COLUMN     "dominantColor" TEXT,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "uploadedAt" TIMESTAMP(3),
ADD COLUMN     "variants" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "country" VARCHAR(60),
ADD COLUMN     "countryVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "handleChangedAt" TIMESTAMP(3),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(60),
ALTER COLUMN "churchName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "denomination" SET DATA TYPE VARCHAR(80);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'TEXT',
    "body" VARCHAR(5000) NOT NULL DEFAULT '',
    "verseTranslationId" INTEGER,
    "verseBookId" TEXT,
    "verseChapter" INTEGER,
    "verseStart" INTEGER,
    "verseEnd" INTEGER,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "commentsLocked" BOOLEAN NOT NULL DEFAULT false,
    "removedByModeration" BOOLEAN NOT NULL DEFAULT false,
    "amenCount" INTEGER NOT NULL DEFAULT 0,
    "loveCount" INTEGER NOT NULL DEFAULT 0,
    "encouragedCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "postId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "altText" VARCHAR(300) NOT NULL DEFAULT '',

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("postId","position")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" VARCHAR(2000) NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenByPostAuthor" BOOLEAN NOT NULL DEFAULT false,
    "removedByModeration" BOOLEAN NOT NULL DEFAULT false,
    "amenCount" INTEGER NOT NULL DEFAULT 0,
    "loveCount" INTEGER NOT NULL DEFAULT 0,
    "encouragedCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "block" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "mute" (
    "muterId" TEXT NOT NULL,
    "mutedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mute_pkey" PRIMARY KEY ("muterId","mutedId")
);

-- CreateTable
CREATE TABLE "post_bookmark" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_bookmark_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "mention" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "userId" TEXT NOT NULL,
    "handle" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "groupKey" VARCHAR(120) NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_actor" (
    "notificationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_actor_pkey" PRIMARY KEY ("notificationId","actorId")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "userId" TEXT NOT NULL,
    "reaction" BOOLEAN NOT NULL DEFAULT true,
    "comment" BOOLEAN NOT NULL DEFAULT true,
    "reply" BOOLEAN NOT NULL DEFAULT true,
    "mention" BOOLEAN NOT NULL DEFAULT true,
    "follow" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "moderation_case" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetAuthorId" TEXT,
    "targetAuthorMinor" BOOLEAN NOT NULL DEFAULT false,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dominantReason" "ReportReason" NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "trustedReportCount" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT,
    "autoHiddenAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "evidenceSnapshot" JSONB NOT NULL,
    "reporterTrusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_action" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "publicReason" VARCHAR(500) NOT NULL,
    "internalNote" VARCHAR(1000),
    "durationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SanctionKind" NOT NULL,
    "caseId" TEXT,
    "actionId" TEXT,
    "issuedById" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_authorId_createdAt_id_idx" ON "post"("authorId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "post_createdAt_id_idx" ON "post"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "post_media_assetId_key" ON "post_media"("assetId");

-- CreateIndex
CREATE INDEX "comment_postId_parentId_createdAt_id_idx" ON "comment"("postId", "parentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "comment_authorId_createdAt_idx" ON "comment"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reaction_postId_idx" ON "reaction"("postId");

-- CreateIndex
CREATE INDEX "reaction_commentId_idx" ON "reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_userId_postId_key" ON "reaction"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_userId_commentId_key" ON "reaction"("userId", "commentId");

-- CreateIndex
CREATE INDEX "follow_followingId_createdAt_idx" ON "follow"("followingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "block_blockedId_idx" ON "block"("blockedId");

-- CreateIndex
CREATE INDEX "post_bookmark_userId_createdAt_idx" ON "post_bookmark"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mention_userId_idx" ON "mention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mention_postId_userId_key" ON "mention"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "mention_commentId_userId_key" ON "mention"("commentId", "userId");

-- CreateIndex
CREATE INDEX "notification_recipientId_updatedAt_id_idx" ON "notification"("recipientId", "updatedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "notification_actor_actorId_idx" ON "notification_actor"("actorId");

-- CreateIndex
CREATE INDEX "moderation_case_status_priority_createdAt_idx" ON "moderation_case"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_case_targetType_targetId_idx" ON "moderation_case"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "moderation_case_targetAuthorId_createdAt_idx" ON "moderation_case"("targetAuthorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "report_caseId_createdAt_idx" ON "report"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporterId_targetType_targetId_key" ON "report"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "moderation_action_caseId_createdAt_idx" ON "moderation_action"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "sanction_userId_createdAt_idx" ON "sanction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "profile_avatarId_key" ON "profile"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_bannerId_key" ON "profile"("bannerId");

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_verseTranslationId_fkey" FOREIGN KEY ("verseTranslationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_verseBookId_fkey" FOREIGN KEY ("verseBookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mute" ADD CONSTRAINT "mute_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mute" ADD CONSTRAINT "mute_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_bookmark" ADD CONSTRAINT "post_bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_bookmark" ADD CONSTRAINT "post_bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention" ADD CONSTRAINT "mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_actor" ADD CONSTRAINT "notification_actor_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_actor" ADD CONSTRAINT "notification_actor_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_targetAuthorId_fkey" FOREIGN KEY ("targetAuthorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "moderation_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "moderation_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "moderation_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "moderation_action"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- SQL complémentaire (non exprimable en Prisma) — Phase 3, voir docs/11-DATABASE-DESIGN.md
-- ---------------------------------------------------------------------------

-- Profil : visibilité par champ public / abonnés / moi uniquement (la valeur COMMUNITY n'a pas de sens pour un profil).
ALTER TABLE "profile" ADD CONSTRAINT "profile_field_visibility_chk" CHECK (
  "churchVisibility" IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE')
  AND "locationVisibility" IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE')
  AND "countryVisibility" IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE')
  AND "denominationVisibility" IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE')
);
CREATE INDEX "profile_handle_trgm_idx" ON "profile" USING GIN ("handle" gin_trgm_ops);

-- Mineurs déjà inscrits : non découvrables par défaut (docs/20). L'année de naissance absente compte comme mineur.
UPDATE "profile" p SET "isDiscoverable" = false, "locationVisibility" = 'PRIVATE', "countryVisibility" = 'PRIVATE'
FROM "user" u
WHERE u."id" = p."userId" AND (u."birthYear" IS NULL OR EXTRACT(YEAR FROM now())::int - u."birthYear" < 18);

-- Publication : verset cité tout ou rien, plage valide ; compteurs jamais négatifs.
ALTER TABLE "post" ADD CONSTRAINT "post_verse_ref_chk" CHECK (
  (num_nulls("verseTranslationId", "verseBookId", "verseChapter", "verseStart", "verseEnd") = 5)
  OR (num_nulls("verseTranslationId", "verseBookId", "verseChapter", "verseStart", "verseEnd") = 0
      AND "verseChapter" >= 1 AND "verseStart" >= 1 AND "verseEnd" >= "verseStart" AND "verseEnd" - "verseStart" < 30)
);
ALTER TABLE "post" ADD CONSTRAINT "post_counters_chk" CHECK (
  "amenCount" >= 0 AND "loveCount" >= 0 AND "encouragedCount" >= 0 AND "commentCount" >= 0
);
-- Fils « Découvrir » et « Abonnements » : seules les publications visibles sont parcourues (pagination (createdAt, id)).
CREATE INDEX "post_visible_feed_idx" ON "post" ("createdAt" DESC, "id" DESC) WHERE "deletedAt" IS NULL AND NOT "isHidden";
CREATE INDEX "post_visible_author_idx" ON "post" ("authorId", "createdAt" DESC, "id" DESC) WHERE "deletedAt" IS NULL AND NOT "isHidden";

ALTER TABLE "post_media" ADD CONSTRAINT "post_media_position_chk" CHECK ("position" BETWEEN 0 AND 3);

ALTER TABLE "comment" ADD CONSTRAINT "comment_counters_chk" CHECK (
  "amenCount" >= 0 AND "loveCount" >= 0 AND "encouragedCount" >= 0 AND "replyCount" >= 0
);

-- Un seul niveau de réponse : le parent est un commentaire de premier niveau de la même publication.
CREATE FUNCTION comment_single_level_reply() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."parentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "comment" parent
    WHERE parent."id" = NEW."parentId" AND parent."parentId" IS NULL AND parent."postId" = NEW."postId"
  ) THEN
    RAISE EXCEPTION 'réponse sur un seul niveau uniquement' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "comment_single_level_reply_trg" BEFORE INSERT OR UPDATE OF "parentId", "postId" ON "comment"
  FOR EACH ROW EXECUTE FUNCTION comment_single_level_reply();

-- Réaction et mention : exactement une cible.
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_single_target_chk" CHECK (num_nonnulls("postId", "commentId") = 1);
ALTER TABLE "mention" ADD CONSTRAINT "mention_single_target_chk" CHECK (num_nonnulls("postId", "commentId") = 1);

-- Relations : jamais envers soi-même.
ALTER TABLE "follow" ADD CONSTRAINT "follow_not_self_chk" CHECK ("followerId" <> "followingId");
ALTER TABLE "block" ADD CONSTRAINT "block_not_self_chk" CHECK ("blockerId" <> "blockedId");
ALTER TABLE "mute" ADD CONSTRAINT "mute_not_self_chk" CHECK ("muterId" <> "mutedId");

-- Notifications : un seul groupe non lu par destinataire et clé (upsert atomique du regroupement).
CREATE UNIQUE INDEX "notification_open_group_key" ON "notification" ("recipientId", "groupKey") WHERE "readAt" IS NULL;
CREATE INDEX "notification_unread_idx" ON "notification" ("recipientId") WHERE "readAt" IS NULL;

-- Modération : un dossier ouvert par cible ; priorité 0 (critique) à 3 (faible).
CREATE UNIQUE INDEX "moderation_case_open_target_key" ON "moderation_case" ("targetType", "targetId")
  WHERE "status" IN ('OPEN', 'IN_PROGRESS');
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_priority_chk" CHECK ("priority" BETWEEN 0 AND 3);
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_duration_chk" CHECK ("durationDays" IS NULL OR "durationDays" BETWEEN 1 AND 3650);

-- Historique des décisions en append-only pour le rôle applicatif (comme audit_log).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "moderation_action" FROM eparole_app;
  END IF;
END
$$;
