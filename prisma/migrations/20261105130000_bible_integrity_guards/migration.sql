-- Garde-fous d'intégrité issus de l'audit de sécurité de la Phase 2.

-- Un verset ne se réécrit jamais, même avec le rôle propriétaire, et une version sortie de STAGED est figée :
-- corriger le texte passe par une nouvelle version importée (docs/bible/BIBLE-LICENSING.md, règle 4).
CREATE FUNCTION public.bible_verse_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public, pg_temp
  AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'le texte biblique est immuable' USING ERRCODE = 'restrict_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "bible_translation_version" WHERE "id" = NEW."versionId" AND "status" = 'STAGED') THEN
    RAISE EXCEPTION 'version % figée : ajout de verset refusé', NEW."versionId" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "bible_verse_guard" BEFORE INSERT OR UPDATE ON "bible_verse"
  FOR EACH ROW EXECUTE FUNCTION public.bible_verse_guard();

-- L'activation recalcule chaque SHA-256 : une version altérée après son import n'est jamais publiée.
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
  IF v_status <> 'STAGED' THEN
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
