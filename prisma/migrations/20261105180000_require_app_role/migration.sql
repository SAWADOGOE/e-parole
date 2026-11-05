-- Les droits restreints du rôle applicatif (texte biblique en lecture seule, audit append-only) visent le rôle nommé
-- eparole_app. Sous un autre nom, ces REVOKE seraient ignorés sans erreur : l'installation doit échouer ici.
-- Le contrôle complet des droits est refait au démarrage du web et du worker (src/server/db/privileges.ts).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_app') THEN
    RAISE EXCEPTION 'Rôle eparole_app absent : créez-le avant de migrer (docker/postgres/init/01-roles.sh). Ce nom est imposé.'
      USING ERRCODE = 'undefined_object';
  END IF;
END
$$;
