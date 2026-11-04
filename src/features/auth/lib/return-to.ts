const BASE = "https://eparole.invalid";

/**
 * N'accepte qu'un chemin interne (évite les redirections ouvertes).
 * Le parseur d'URL ignore tabulations et retours à la ligne : on compare donc l'origine APRÈS analyse,
 * et on refuse tout caractère de contrôle ou antislash.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
