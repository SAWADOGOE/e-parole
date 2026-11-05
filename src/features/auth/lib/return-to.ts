const BASE = "https://eparole.invalid";

/**
 * N'accepte qu'un chemin interne (évite les redirections ouvertes).
 * - refuse caractères de contrôle, antislash et segments « . » / « .. » (le parseur les normalise,
 *   par ex. « /.//evil.test » deviendrait « //evil.test ») ;
 * - compare l'origine après analyse ;
 * - revalide la chaîne RENVOYÉE : elle ne doit jamais commencer par « // ».
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  if (/(^|\/)\.{1,2}(\/|$|\?|#)/.test(value) || /%2e/i.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  const result = `${url.pathname}${url.search}${url.hash}`;
  return result.startsWith("/") && !result.startsWith("//") ? result : fallback;
}
