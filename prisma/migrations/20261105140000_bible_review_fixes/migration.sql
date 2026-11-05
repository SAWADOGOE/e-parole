-- Corrections issues de la revue de code de la Phase 2.

-- Une ligne d'état créée par la position de lecture ne vaut pas choix de réglages :
-- sans cette date, les valeurs par défaut écraseraient les réglages locaux d'un nouveau compte.
ALTER TABLE "bible_reading_state" ADD COLUMN "prefsSetAt" TIMESTAMP(3);

-- Retour arrière : une version retirée peut être réactivée, avec le même contrôle des checksums.
-- Seule une version déjà active est refusée.
CREATE OR REPLACE FUNCTION public.bible_activate_version(p_version_id integer) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
  AS $$
DECLARE
  v_translation_id integer;
  v_status "BibleVersionStatus";
  v_expected integer;
  v_actual bigint;
  v_altered bigint;
BEGIN
  SELECT "translationId", "status", "verseCount" INTO v_translation_id, v_status, v_expected
    FROM "bible_translation_version" WHERE "id" = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'version % introuvable', p_version_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status = 'ACTIVE' THEN
    RAISE EXCEPTION 'version % non activable (statut %)', p_version_id, v_status USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE encode(sha256(convert_to("text", 'UTF8')), 'hex') <> "checksum")
    INTO v_actual, v_altered
    FROM "bible_verse" WHERE "versionId" = p_version_id;
  IF v_actual <> v_expected THEN
    RAISE EXCEPTION 'version % incomplète : % versets pour % attendus', p_version_id, v_actual, v_expected
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_altered > 0 THEN
    RAISE EXCEPTION 'version % altérée : % versets ne correspondent pas à leur checksum', p_version_id, v_altered
      USING ERRCODE = 'check_violation';
  END IF;
  UPDATE "bible_translation_version" SET "status" = 'RETIRED'
    WHERE "translationId" = v_translation_id AND "status" = 'ACTIVE';
  UPDATE "bible_translation_version" SET "status" = 'ACTIVE', "activatedAt" = now() WHERE "id" = p_version_id;
  UPDATE "bible_translation" SET "activeVersionId" = p_version_id, "updatedAt" = now() WHERE "id" = v_translation_id;
END
$$;
