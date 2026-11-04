const HANDLE_MAX_BASE = 24;

/** Dérive un @handle valide (^[a-z0-9_]{3,30}$) à partir du nom affiché. */
export function handleBaseFromName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX_BASE);
  return base.length >= 3 ? base : `membre${base}`;
}
