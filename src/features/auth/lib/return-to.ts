/** N'accepte qu'un chemin interne relatif (évite les redirections ouvertes). */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://")) return fallback;
  return value;
}
