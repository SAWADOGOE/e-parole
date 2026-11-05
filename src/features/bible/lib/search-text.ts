/** Délimiteurs de ts_headline : caractères de contrôle absents du texte, découpés sans jamais produire de HTML. */
export const HEADLINE_START = "\u0001";
export const HEADLINE_STOP = "\u0002";

export function splitHeadline(headline: string): { text: string; match: boolean }[] {
  const segments: { text: string; match: boolean }[] = [];
  for (const [index, part] of headline.split(HEADLINE_START).entries()) {
    if (index === 0) {
      if (part) segments.push({ text: part, match: false });
      continue;
    }
    const [matched = "", rest = ""] = part.split(HEADLINE_STOP);
    if (matched) segments.push({ text: matched, match: true });
    if (rest) segments.push({ text: rest, match: false });
  }
  return segments;
}

/** Curseur opaque (rang, id) : le rang est conservé en texte pour rester exact d'une page à l'autre. */
export function encodeCursor(rank: string, id: number): string {
  return Buffer.from(`${rank}:${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { rank: string; id: number } | null {
  if (!cursor) return null;
  const match = /^(\d+(?:\.\d+)?(?:e-?\d+)?):(\d{1,10})$/.exec(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!match?.[1] || !match[2]) return null;
  return { rank: match[1], id: Number(match[2]) };
}
