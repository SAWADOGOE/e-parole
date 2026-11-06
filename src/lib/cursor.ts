/** Curseur opaque de pagination (createdAt, id) — docs/13-API-DESIGN.md. */
export interface Cursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url");
}

/** Curseur invalide ou falsifié : null (première page), jamais une erreur 500. */
export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value || value.length > 120) return null;
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  const [iso, id, extra] = decoded.split("|");
  if (!iso || !id || extra !== undefined || !/^[a-z0-9]{1,64}$/.test(id)) return null;
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== iso) return null;
  return { createdAt, id };
}
