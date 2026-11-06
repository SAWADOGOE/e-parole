/**
 * Découpe un texte de membre en jetons affichables : jamais de HTML, jamais de dangerouslySetInnerHTML.
 * Fonction pure : la résolution des mentions et des références bibliques est fournie par l'appelant.
 */

export interface VerseLink {
  href: string;
  label: string;
}

export type RichToken =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "mention"; text: string; handle: string }
  | { kind: "verse"; text: string; href: string };

export interface RichTextResolvers {
  /** Handle courant d'une mention résolue à l'écriture (forme écrite en minuscules), sinon null. */
  mention: (writtenHandle: string) => string | null;
  /** Lien vers le lecteur si le texte est une référence biblique valide, sinon null. */
  verse: (candidate: string) => string | null;
}

const URL_PATTERN = /https?:\/\/[^\s<>"'«»]+/giu;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/u;
const MENTION_PATTERN = /(^|[^\p{L}\p{N}_@/])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_])/gu;
/** « Jean 3:16 », « 1 Co 13.4-7 », « Psaume 23 » : livre (avec chiffre initial éventuel), chapitre, verset(s). */
const VERSE_PATTERN = /(?<![\p{L}\p{N}])((?:[1-3]\s?)?\p{Lu}\p{Ll}{1,14}\.?(?:\s(?:des|de)\s\p{Lu}\p{Ll}+)?)\s(\d{1,3})(?:\s?[:.,]\s?(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?)?(?![\p{L}\p{N}])/gu;

interface Span {
  start: number;
  end: number;
  token: RichToken;
}

function urlSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0].replace(TRAILING_PUNCTUATION, "");
    const start = match.index;
    if (raw.length < 10) continue;
    let href: string;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      href = url.toString();
    } catch {
      continue;
    }
    spans.push({ start, end: start + raw.length, token: { kind: "link", text: raw, href } });
  }
  return spans;
}

function overlaps(spans: readonly Span[], start: number, end: number): boolean {
  return spans.some((span) => start < span.end && end > span.start);
}

/** Mentions écrites dans le texte (minuscules, sans doublon), hors URL. */
export function extractMentionHandles(text: string, limit: number): string[] {
  const urls = urlSpans(text);
  const handles: string[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const handle = match[2];
    if (!handle) continue;
    const start = match.index + (match[1]?.length ?? 0);
    if (overlaps(urls, start, start + handle.length + 1)) continue;
    const lower = handle.toLowerCase();
    if (!handles.includes(lower)) handles.push(lower);
    if (handles.length >= limit) break;
  }
  return handles;
}

export function tokenizeRichText(text: string, resolvers: RichTextResolvers): RichToken[] {
  const spans = urlSpans(text);
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const handle = match[2];
    if (!handle) continue;
    const start = match.index + (match[1]?.length ?? 0);
    const end = start + handle.length + 1;
    if (overlaps(spans, start, end)) continue;
    const current = resolvers.mention(handle.toLowerCase());
    if (current) spans.push({ start, end, token: { kind: "mention", text: `@${handle}`, handle: current } });
  }
  // Un candidat refusé (« Voir 1 » dans « Voir 1 Co 13:4 ») ne doit pas masquer la vraie référence qui le chevauche :
  // la recherche reprend au caractère suivant plutôt qu'après le candidat.
  const verses = new RegExp(VERSE_PATTERN.source, VERSE_PATTERN.flags);
  for (let match = verses.exec(text); match; match = verses.exec(text)) {
    const start = match.index;
    const end = start + match[0].length;
    const href = overlaps(spans, start, end) ? null : resolvers.verse(match[0]);
    if (href) {
      spans.push({ start, end, token: { kind: "verse", text: match[0], href } });
    } else {
      verses.lastIndex = start + 1;
    }
  }
  spans.sort((a, b) => a.start - b.start);

  const tokens: RichToken[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) tokens.push({ kind: "text", text: text.slice(cursor, span.start) });
    tokens.push(span.token);
    cursor = span.end;
  }
  if (cursor < text.length) tokens.push({ kind: "text", text: text.slice(cursor) });
  return tokens;
}
