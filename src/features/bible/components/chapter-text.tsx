import { Bookmark, NotebookPen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ChapterAnnotations, ChapterVerse, HighlightColorName, VerseRange } from "../types";

interface ChapterTextProps {
  reference: string;
  verses: readonly ChapterVerse[];
  annotations: ChapterAnnotations | null;
  focus: VerseRange | null;
}

const covers = (range: VerseRange, verse: number): boolean => verse >= range.verseStart && verse <= range.verseEnd;

/**
 * Texte du chapitre, 100 % serveur : lisible sans JavaScript, jamais hydraté.
 * L'îlot ReaderChrome s'y greffe ensuite (rôles de sélection, événements) sans re-rendre le texte.
 */
export async function ChapterText({ reference, verses, annotations, focus }: ChapterTextProps) {
  const t = await getTranslations("bible");
  return (
    <div id="verses" aria-label={t("versesLabel", { reference })} className="flex flex-col gap-1">
      {verses.map(({ verse, text }) => {
        const color: HighlightColorName | undefined = annotations?.highlights.find((mark) => covers(mark, verse))?.color;
        const hasNote = annotations?.notes.some((mark) => covers(mark, verse)) ?? false;
        const isBookmarked = annotations?.bookmarks.some((mark) => covers(mark, verse)) ?? false;
        return (
          <p
            key={verse}
            id={`v${verse}`}
            data-v={verse}
            data-highlight={color}
            data-focus={focus && covers(focus, verse) ? "" : undefined}
            className="verse"
          >
            <sup className="verse-number">
              <span aria-hidden="true">{verse}</span>
              <span className="sr-only">{t("verseLabel", { verse })}</span>
            </sup>
            <span className="verse-text">{text}</span>
            {color ? <span className="sr-only"> ({t("highlightedLabel", { color: t(`colors.${color}`) })})</span> : null}
            {hasNote ? (
              <span className="ml-1 inline-block align-middle text-gold-fg">
                <NotebookPen aria-hidden="true" className="inline size-4" />
                <span className="sr-only">{t("noteMarker")}</span>
              </span>
            ) : null}
            {isBookmarked ? (
              <span className="ml-1 inline-block align-middle text-gold-fg">
                <Bookmark aria-hidden="true" className="inline size-4" />
                <span className="sr-only">{t("bookmarkMarker")}</span>
              </span>
            ) : null}
          </p>
        );
      })}
    </div>
  );
}
