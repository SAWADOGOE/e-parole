import Link from "next/link";
import { profilePath } from "../lib/paths";
import { tokenizeRichText } from "../lib/rich-text";
import type { MentionView } from "../types";

interface RichTextProps {
  text: string;
  mentions: readonly MentionView[];
  resolveVerse: (candidate: string) => string | null;
  className?: string;
}

/**
 * Texte d'un membre rendu par React (échappement automatique) : jamais de HTML brut, jamais d'injection de balisage.
 * Liens externes en nofollow ugc noopener ; références bibliques vers le lecteur ; mentions vers le profil.
 */
export function RichText({ text, mentions, resolveVerse, className }: RichTextProps) {
  const byHandle = new Map(mentions.map((mention) => [mention.written, mention.handle]));
  const tokens = tokenizeRichText(text, { mention: (handle) => byHandle.get(handle) ?? null, verse: resolveVerse });
  return (
    <p className={className}>
      {tokens.map((token, index) => {
        switch (token.kind) {
          case "text":
            return <span key={index}>{token.text}</span>;
          case "link":
            return (
              <a key={index} href={token.href} rel="nofollow ugc noopener noreferrer" className="break-all text-accent underline underline-offset-4">
                {token.text}
              </a>
            );
          case "mention":
            return (
              <Link key={index} href={profilePath(token.handle)} className="font-medium text-accent underline underline-offset-4">
                {token.text}
              </Link>
            );
          case "verse":
            return (
              <Link key={index} href={token.href} className="font-medium text-accent underline underline-offset-4">
                {token.text}
              </Link>
            );
          default: {
            const exhaustive: never = token;
            return exhaustive;
          }
        }
      })}
    </p>
  );
}
