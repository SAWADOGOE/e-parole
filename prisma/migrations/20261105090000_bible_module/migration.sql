-- Module Bible (Phase 2). Spécification : docs/bible/BIBLE-DATABASE-SCHEMA.md, docs/bible/BIBLE-SEARCH.md.

-- ---------------------------------------------------------------------------
-- Recherche plein texte : extensions, configuration française sans accents
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TEXT SEARCH CONFIGURATION public.french_unaccent (COPY = pg_catalog.french);
ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, french_stem;

-- Wrappers IMMUTABLE : unaccent() est STABLE et la configuration doit être qualifiée pour
-- qu'une colonne générée ou un index ne dépende jamais du search_path de la session.
CREATE FUNCTION public.bible_fts_vector(content text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$ SELECT to_tsvector('public.french_unaccent'::regconfig, content) $$;

CREATE FUNCTION public.bible_fold(content text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, content)) $$;

-- CreateEnum
CREATE TYPE "BibleLicense" AS ENUM ('PUBLIC_DOMAIN', 'CC_BY', 'CC_BY_SA', 'LICENSED');

-- CreateEnum
CREATE TYPE "BibleVersionStatus" AS ENUM ('STAGED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "Testament" AS ENUM ('OT', 'NT');

-- CreateEnum
CREATE TYPE "HighlightColor" AS ENUM ('YELLOW', 'GREEN', 'BLUE', 'PINK', 'PURPLE');

-- CreateEnum
CREATE TYPE "ReaderTheme" AS ENUM ('SYSTEM', 'LIGHT', 'SEPIA', 'DARK');

-- CreateEnum
CREATE TYPE "ReaderFont" AS ENUM ('SERIF', 'SANS');

-- CreateTable
CREATE TABLE "bible_translation" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "licenseType" "BibleLicense" NOT NULL,
    "licenseUrl" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceRetrievedAt" TIMESTAMP(3) NOT NULL,
    "licenseEvidence" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "activeVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bible_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_translation_version" (
    "id" SERIAL NOT NULL,
    "translationId" INTEGER NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "sourceRetrievedAt" TIMESTAMP(3) NOT NULL,
    "checksum" TEXT NOT NULL,
    "bookCount" INTEGER NOT NULL,
    "chapterCount" INTEGER NOT NULL,
    "verseCount" INTEGER NOT NULL,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "status" "BibleVersionStatus" NOT NULL DEFAULT 'STAGED',
    "report" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "bible_translation_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_book" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "testament" "Testament" NOT NULL,
    "chapterCount" INTEGER NOT NULL,

    CONSTRAINT "bible_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_book_name" (
    "bookId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abbreviations" TEXT[],

    CONSTRAINT "bible_book_name_pkey" PRIMARY KEY ("bookId","language")
);

-- CreateTable
CREATE TABLE "bible_chapter_meta" (
    "versionId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseCount" INTEGER NOT NULL,

    CONSTRAINT "bible_chapter_meta_pkey" PRIMARY KEY ("versionId","bookId","chapter")
);

-- CreateTable
CREATE TABLE "bible_verse" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "search" tsvector GENERATED ALWAYS AS (public.bible_fts_vector("text")) STORED,

    CONSTRAINT "bible_verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_highlight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "translationId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "color" "HighlightColor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bible_highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "translationId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bible_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "translationId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bible_bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_reading_state" (
    "userId" TEXT NOT NULL,
    "translationId" INTEGER,
    "bookId" TEXT,
    "chapter" INTEGER,
    "fontSize" INTEGER NOT NULL DEFAULT 19,
    "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "theme" "ReaderTheme" NOT NULL DEFAULT 'SYSTEM',
    "font" "ReaderFont" NOT NULL DEFAULT 'SERIF',
    "showVerseNumbers" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bible_reading_state_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "daily_verse" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "translationId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "reflection" VARCHAR(200),
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "scheduledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_verse_pool" (
    "id" SERIAL NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "daily_verse_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bible_translation_code_key" ON "bible_translation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bible_translation_activeVersionId_key" ON "bible_translation"("activeVersionId");

-- CreateIndex
CREATE INDEX "bible_translation_version_translationId_status_idx" ON "bible_translation_version"("translationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bible_book_order_key" ON "bible_book"("order");

-- CreateIndex
CREATE INDEX "bible_book_testament_order_idx" ON "bible_book"("testament", "order");

-- CreateIndex
CREATE UNIQUE INDEX "bible_book_name_language_slug_key" ON "bible_book_name"("language", "slug");

-- CreateIndex
CREATE INDEX "bible_verse_search_idx" ON "bible_verse" USING GIN ("search");

-- CreateIndex
CREATE UNIQUE INDEX "bible_verse_versionId_bookId_chapter_verse_key" ON "bible_verse"("versionId", "bookId", "chapter", "verse");

-- CreateIndex
CREATE INDEX "bible_highlight_userId_translationId_bookId_chapter_idx" ON "bible_highlight"("userId", "translationId", "bookId", "chapter");

-- CreateIndex
CREATE INDEX "bible_highlight_userId_createdAt_id_idx" ON "bible_highlight"("userId", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "bible_note_userId_translationId_bookId_chapter_idx" ON "bible_note"("userId", "translationId", "bookId", "chapter");

-- CreateIndex
CREATE INDEX "bible_note_userId_createdAt_id_idx" ON "bible_note"("userId", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "bible_bookmark_userId_createdAt_id_idx" ON "bible_bookmark"("userId", "createdAt" DESC, "id");

-- CreateIndex
CREATE UNIQUE INDEX "bible_bookmark_userId_translationId_bookId_chapter_verseSta_key" ON "bible_bookmark"("userId", "translationId", "bookId", "chapter", "verseStart", "verseEnd");

-- CreateIndex
CREATE UNIQUE INDEX "daily_verse_date_key" ON "daily_verse"("date");

-- CreateIndex
CREATE INDEX "daily_verse_bookId_chapter_verseStart_idx" ON "daily_verse"("bookId", "chapter", "verseStart");

-- CreateIndex
CREATE UNIQUE INDEX "daily_verse_pool_bookId_chapter_verseStart_verseEnd_key" ON "daily_verse_pool"("bookId", "chapter", "verseStart", "verseEnd");

-- AddForeignKey
ALTER TABLE "bible_translation" ADD CONSTRAINT "bible_translation_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "bible_translation_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_translation_version" ADD CONSTRAINT "bible_translation_version_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_book_name" ADD CONSTRAINT "bible_book_name_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_chapter_meta" ADD CONSTRAINT "bible_chapter_meta_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "bible_translation_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_chapter_meta" ADD CONSTRAINT "bible_chapter_meta_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "bible_translation_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_highlight" ADD CONSTRAINT "bible_highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_highlight" ADD CONSTRAINT "bible_highlight_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_highlight" ADD CONSTRAINT "bible_highlight_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_note" ADD CONSTRAINT "bible_note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_note" ADD CONSTRAINT "bible_note_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_note" ADD CONSTRAINT "bible_note_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_bookmark" ADD CONSTRAINT "bible_bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_bookmark" ADD CONSTRAINT "bible_bookmark_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_bookmark" ADD CONSTRAINT "bible_bookmark_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_reading_state" ADD CONSTRAINT "bible_reading_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bible_reading_state" ADD CONSTRAINT "bible_reading_state_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_verse" ADD CONSTRAINT "daily_verse_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "bible_translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_verse" ADD CONSTRAINT "daily_verse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_verse" ADD CONSTRAINT "daily_verse_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_verse_pool" ADD CONSTRAINT "daily_verse_pool_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "bible_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Index et contraintes que Prisma n'exprime pas
-- ---------------------------------------------------------------------------
-- Une seule version ACTIVE par traduction.
CREATE UNIQUE INDEX "bible_translation_version_one_active_idx"
  ON "bible_translation_version" ("translationId") WHERE "status" = 'ACTIVE';

-- Suggestions de livres par trigrammes (« Jea » → Jean, Jacques).
CREATE INDEX "bible_book_name_trgm_idx" ON "bible_book_name" USING GIN (public.bible_fold("name") gin_trgm_ops);

ALTER TABLE "bible_book" ADD CONSTRAINT "bible_book_order_check" CHECK ("order" BETWEEN 1 AND 66);
ALTER TABLE "bible_book" ADD CONSTRAINT "bible_book_chapter_count_check" CHECK ("chapterCount" > 0);
ALTER TABLE "bible_chapter_meta" ADD CONSTRAINT "bible_chapter_meta_range_check" CHECK ("chapter" > 0 AND "verseCount" > 0);
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_range_check" CHECK ("chapter" > 0 AND "verse" > 0);
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_text_check" CHECK (length("text") > 0);
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$');
ALTER TABLE "bible_highlight" ADD CONSTRAINT "bible_highlight_range_check" CHECK ("chapter" > 0 AND "verseStart" > 0 AND "verseEnd" >= "verseStart");
ALTER TABLE "bible_note" ADD CONSTRAINT "bible_note_range_check" CHECK ("chapter" > 0 AND "verseStart" > 0 AND "verseEnd" >= "verseStart");
ALTER TABLE "bible_note" ADD CONSTRAINT "bible_note_body_check" CHECK (length(btrim("body")) > 0);
ALTER TABLE "bible_bookmark" ADD CONSTRAINT "bible_bookmark_range_check" CHECK ("chapter" > 0 AND "verseStart" > 0 AND "verseEnd" >= "verseStart");
ALTER TABLE "bible_reading_state" ADD CONSTRAINT "bible_reading_state_font_size_check" CHECK ("fontSize" BETWEEN 16 AND 28);
ALTER TABLE "bible_reading_state" ADD CONSTRAINT "bible_reading_state_line_height_check" CHECK ("lineHeight" BETWEEN 1.5 AND 1.9);
ALTER TABLE "daily_verse" ADD CONSTRAINT "daily_verse_range_check" CHECK ("chapter" > 0 AND "verseStart" > 0 AND "verseEnd" >= "verseStart");
ALTER TABLE "daily_verse_pool" ADD CONSTRAINT "daily_verse_pool_range_check" CHECK ("chapter" > 0 AND "verseStart" > 0 AND "verseEnd" >= "verseStart");

-- ---------------------------------------------------------------------------
-- Immutabilité du texte biblique
-- Rôle d'import sans LOGIN ni mot de passe : la CLI s'y place par SET ROLE depuis le rôle
-- propriétaire. Aucun secret n'est donc nécessaire dans cette migration.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_bible_import') THEN
    CREATE ROLE eparole_bible_import NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;

GRANT eparole_bible_import TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO eparole_bible_import;

GRANT SELECT ON "bible_book", "bible_book_name" TO eparole_bible_import;
GRANT SELECT, INSERT, UPDATE ON "bible_translation" TO eparole_bible_import;
GRANT SELECT, INSERT ON "bible_translation_version", "bible_chapter_meta", "bible_verse" TO eparole_bible_import;
GRANT UPDATE ("status", "activatedAt") ON "bible_translation_version" TO eparole_bible_import;
GRANT USAGE, SELECT ON SEQUENCE "bible_translation_id_seq", "bible_translation_version_id_seq", "bible_verse_id_seq" TO eparole_bible_import;

-- Activation et publication : seules écritures atteignables depuis l'application (SUPER_ADMIN, audité),
-- limitées à une bascule d'état. Elles ne peuvent toucher ni au texte ni aux checksums.
CREATE FUNCTION public.bible_activate_version(p_version_id integer) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
  AS $$
DECLARE
  v_translation_id integer;
  v_status "BibleVersionStatus";
  v_expected integer;
  v_actual bigint;
BEGIN
  SELECT "translationId", "status", "verseCount" INTO v_translation_id, v_status, v_expected
    FROM "bible_translation_version" WHERE "id" = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'version % introuvable', p_version_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status <> 'STAGED' THEN
    RAISE EXCEPTION 'version % non activable (statut %)', p_version_id, v_status USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO v_actual FROM "bible_verse" WHERE "versionId" = p_version_id;
  IF v_actual <> v_expected THEN
    RAISE EXCEPTION 'version % incomplète : % versets pour % attendus', p_version_id, v_actual, v_expected
      USING ERRCODE = 'check_violation';
  END IF;
  UPDATE "bible_translation_version" SET "status" = 'RETIRED'
    WHERE "translationId" = v_translation_id AND "status" = 'ACTIVE';
  UPDATE "bible_translation_version" SET "status" = 'ACTIVE', "activatedAt" = now() WHERE "id" = p_version_id;
  UPDATE "bible_translation" SET "activeVersionId" = p_version_id, "updatedAt" = now() WHERE "id" = v_translation_id;
END
$$;

CREATE FUNCTION public.bible_set_published(p_translation_id integer, p_published boolean) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
  AS $$
DECLARE
  v_active integer;
BEGIN
  SELECT "activeVersionId" INTO v_active FROM "bible_translation" WHERE "id" = p_translation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'traduction % introuvable', p_translation_id USING ERRCODE = 'no_data_found';
  END IF;
  IF p_published AND v_active IS NULL THEN
    RAISE EXCEPTION 'traduction % sans version active', p_translation_id USING ERRCODE = 'check_violation';
  END IF;
  UPDATE "bible_translation" SET "isPublished" = p_published, "updatedAt" = now() WHERE "id" = p_translation_id;
END
$$;

ALTER FUNCTION public.bible_activate_version(integer) OWNER TO eparole_bible_import;
ALTER FUNCTION public.bible_set_published(integer, boolean) OWNER TO eparole_bible_import;
REVOKE ALL ON FUNCTION public.bible_activate_version(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bible_set_published(integer, boolean) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_app') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
      "bible_translation", "bible_translation_version", "bible_book", "bible_book_name",
      "bible_chapter_meta", "bible_verse", "daily_verse_pool"
      FROM eparole_app;
    REVOKE ALL ON SEQUENCE
      "bible_translation_id_seq", "bible_translation_version_id_seq", "bible_verse_id_seq", "daily_verse_pool_id_seq"
      FROM eparole_app;
    GRANT EXECUTE ON FUNCTION public.bible_activate_version(integer) TO eparole_app;
    GRANT EXECUTE ON FUNCTION public.bible_set_published(integer, boolean) TO eparole_app;
  END IF;
END
$$;
