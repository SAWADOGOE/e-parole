/** Deux initiales en lettres seulement : ponctuation et symboles (« [Démo] ») ne deviennent jamais des initiales. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, ""))
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
