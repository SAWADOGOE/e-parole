import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { passagePath } from "../lib/format";
import type { Passage } from "../types";

interface VerseQuoteProps {
  passage: Passage;
  /** Taille d'affichage : `lg` pour le verset du jour sur l'accueil. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Citation biblique réutilisable : la référence, le texte rendu depuis la base et l'attribution restent indissociables.
 * Le texte n'est jamais recopié ni modifiable par un auteur (docs/bible/BIBLE-MODULE.md, Règles de citation).
 */
export function VerseQuote({ passage, size = "md", className }: VerseQuoteProps) {
  const { bookSlug, chapter, verseStart, verseEnd, reference, verses, attribution } = passage;
  const href = passagePath(bookSlug, chapter, verseStart, verseEnd) as Route;
  return (
    <figure className={cn("min-w-0 border-l-[3px] border-gold pl-4", className)}>
      <blockquote lang="fr" className={cn("font-serif break-words text-fg", size === "lg" ? "text-display-sm" : "text-lg")}>
        « {verses.map((verse) => verse.text).join(" ")} »
      </blockquote>
      <figcaption className="mt-2 text-sm text-muted">
        <Link href={href} className="font-medium text-accent underline underline-offset-4">
          {reference}
        </Link>
        <span aria-hidden="true"> · </span>
        <span>{attribution}</span>
      </figcaption>
    </figure>
  );
}
