import { BookOpen } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getCatalog, getTranslation } from "@/features/bible";
import { chapterPath, formatReference } from "@/features/bible/lib/format";
import { foldText } from "@/features/bible/lib/parse-reference";
import { DEFAULT_BOOK_SLUG } from "@/features/bible/constants";

/** 404 propre : si le livre existe, la page dit combien il compte de chapitres et propose le dernier. */
export default async function ChapterNotFound() {
  const t = await getTranslations("bible");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const segment = /^\/bible\/lsg\/([^/]+)/.exec(pathname)?.[1] ?? "";
  const translation = await getTranslation();
  const books = translation ? await getCatalog(translation) : [];
  const key = foldText(segment).replace(/[\s-]+/g, "");
  const book = books.find((entry) => entry.slug === segment || entry.abbreviations.includes(key));

  return (
    <main id="contenu" tabIndex={-1} className="mx-auto max-w-[38rem] px-4 py-12">
      <EmptyState
        icon={BookOpen}
        title={t("chapterMissingTitle")}
        body={book ? t("chapterMissingChapter", { book: book.name, count: book.chapterCount }) : t("chapterMissingBook")}
        actions={
          <Button asChild>
            {book ? (
              <Link href={chapterPath(book.slug, book.chapterCount)}>{t("goTo", { reference: formatReference(book.name, book.chapterCount) })}</Link>
            ) : (
              <Link href={chapterPath(DEFAULT_BOOK_SLUG, 1)}>{t("goToJohn")}</Link>
            )}
          </Button>
        }
      />
    </main>
  );
}
