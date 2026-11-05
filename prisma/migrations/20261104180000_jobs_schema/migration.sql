-- Schéma de la file de jobs pg-boss, possédé par le rôle applicatif (sans SUPERUSER)
-- pour que le worker puisse installer et migrer ses propres tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eparole_app') THEN
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS pgboss AUTHORIZATION eparole_app';
  ELSE
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS pgboss';
  END IF;
END
$$;
