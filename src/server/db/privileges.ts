import { db } from "./index";

/**
 * Droits que le rôle applicatif ne doit jamais avoir. Ils sont retirés par les migrations, mais un rôle mal nommé
 * ou recréé à la main les garderait sans le moindre signal : on les vérifie donc à chaque démarrage.
 */
const FORBIDDEN_PRIVILEGES: readonly { table: string; privileges: string }[] = [
  { table: "bible_verse", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "bible_translation_version", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "bible_translation", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "bible_book", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "bible_book_name", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "bible_chapter_meta", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "daily_verse_pool", privileges: "INSERT, UPDATE, DELETE, TRUNCATE" },
  { table: "audit_log", privileges: "UPDATE, DELETE, TRUNCATE" },
];

/** Tables sur lesquelles le rôle courant détient un droit interdit (vide si tout est conforme). */
export async function findExcessPrivileges(): Promise<string[]> {
  const tables = FORBIDDEN_PRIVILEGES.map((entry) => entry.table);
  const privileges = FORBIDDEN_PRIVILEGES.map((entry) => entry.privileges);
  const rows = await db.$queryRaw<{ table: string }[]>`
    SELECT t.name AS "table"
    FROM unnest(${tables}::text[], ${privileges}::text[]) AS t(name, privileges)
    WHERE to_regclass('public.' || quote_ident(t.name)) IS NOT NULL
      AND has_table_privilege(current_user, to_regclass('public.' || quote_ident(t.name)), t.privileges)`;
  return rows.map((row) => row.table);
}
