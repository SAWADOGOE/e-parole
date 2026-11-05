import { BookOpen, SearchX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findSimilarBookIds, getCatalog, getTranslation, searchBible, searchQuerySchema } from "@/features/bible";
import { formatReference, passagePath } from "@/features/bible/lib/format";
import { parseReference, type ParsedReference, type ReferenceError } from "@/features/bible/lib/parse-reference";
import type { CatalogBook, SearchPage } from "@/features/bible/types";
import { getActor } from "@/server/auth/session";
import { consumeRateLimit } from "@/server/rate-limit/rate-limit";
import { getRequestContext } from "@/server/request-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bible.search");
  return { title: t("metaTitle") };
}

type Params = Record<string, string | string[] | undefined>;

function buildHref(q: string, filters: { testament?: string | undefined; livre?: string | undefined; curseur?: string | undefined }): Route {
  const params = new URLSearchParams({ q });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return `/bible/recherche?${params.toString()}` as Route;
}

function referencePath(books: readonly CatalogBook[], ref: ParsedReference): string | null {
  const book = books.find((entry) => entry.id === ref.bookId);
  return book ? passagePath(book.slug, ref.chapter, ref.verseStart, ref.verseEnd) : null;
}

function referenceLabel(books: readonly CatalogBook[], ref: ParsedReference): string {
  return formatReference(books.find((entry) => entry.id === ref.bookId)?.name ?? ref.bookId, ref.chapter, ref.verseStart, ref.verseEnd);
}

async function ReferenceHelp({ error, books }: { error: ReferenceError; books: readonly CatalogBook[] }) {
  const t = await getTranslations("bible.search");
  if (error.code === "NOT_A_REFERENCE") return null;
  const bookName = (id: string): string => books.find((entry) => entry.id === id)?.name ?? id;

  if (error.code === "UNKNOWN_BOOK") {
    const fromParser = error.suggestions;
    const ids = fromParser.length > 0 ? fromParser : await findSimilarBookIds(error.input, 5);
    return (
      <div role="status" className="mt-6 rounded-md border bg-bg-elevated p-4">
        <p className="text-fg">{t("bookError", { input: error.input })}</p>
        {ids.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {ids.map((id) => {
              const path = referencePath(books, { bookId: id, chapter: 1 });
              return path ? (
                <li key={id}>
                  <Link href={path} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
                    {bookName(id)}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  const message =
    error.code === "CHAPTER_OUT_OF_RANGE"
      ? t("chapterError", { book: bookName(error.bookId), count: error.maxChapter })
      : error.code === "VERSE_OUT_OF_RANGE"
        ? t("verseError", { book: bookName(error.bookId), chapter: error.chapter, count: error.maxVerse })
        : t("rangeError");
  const path = referencePath(books, error.suggestion);
  return (
    <div role="status" className="mt-6 rounded-md border bg-bg-elevated p-4">
      <p className="text-fg">{message}</p>
      {path ? (
        <Link href={path} className="mt-1 inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          {t("suggestion", { reference: referenceLabel(books, error.suggestion) })}
        </Link>
      ) : null}
    </div>
  );
}

async function Results({ page, q, testament, livre }: { page: SearchPage; q: string; testament: string | undefined; livre: string | undefined }) {
  const t = await getTranslations("bible.search");
  const chip = "inline-flex min-h-11 items-center rounded-full border px-3 text-sm text-fg hover:bg-bg-subtle aria-[current]:border-accent aria-[current]:bg-accent-subtle aria-[current]:font-semibold";
  return (
    <>
      <nav aria-label={t("filtersLabel")} className="mt-6 flex flex-wrap gap-2">
        <Link href={buildHref(q, {})} aria-current={!testament ? "true" : undefined} className={chip}>
          {t("all")}
        </Link>
        <Link href={buildHref(q, { testament: "OT" })} aria-current={testament === "OT" ? "true" : undefined} className={chip}>
          {t("ot")}
        </Link>
        <Link href={buildHref(q, { testament: "NT" })} aria-current={testament === "NT" ? "true" : undefined} className={chip}>
          {t("nt")}
        </Link>
      </nav>
      <p role="status" className="mt-4 text-sm text-muted">
        {t("resultCount", { count: page.total, query: q })} {page.total > 0 ? t("elapsed", { ms: page.elapsedMs }) : null}
      </p>
      {page.facets.length > 1 ? (
        <nav aria-label={t("facetsLabel")} className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href={buildHref(q, { testament })} aria-current={!livre ? "true" : undefined} className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline aria-[current]:font-semibold">
            {t("allBooks")}
          </Link>
          {page.facets.map((facet) => (
            <Link
              key={facet.bookId}
              href={buildHref(q, { testament, livre: facet.bookId })}
              aria-current={livre === facet.bookId ? "true" : undefined}
              className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline aria-[current]:font-semibold"
            >
              {t("facet", { book: facet.bookName, count: facet.count })}
            </Link>
          ))}
        </nav>
      ) : null}
      {page.hits.length === 0 ? (
        <EmptyState icon={SearchX} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <ol className="mt-4 flex flex-col divide-y">
          {page.hits.map((hit) => (
            <li key={hit.id} className="py-4">
              <Link href={passagePath(hit.bookSlug, hit.chapter, hit.verse) as Route} className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
                {hit.reference}
              </Link>
              <p lang="fr" className="mt-1 font-serif text-lg break-words text-fg">
                {hit.segments.map((segment, index) =>
                  segment.match ? (
                    <mark key={index} className="rounded-xs bg-accent-subtle font-semibold text-fg underline decoration-accent underline-offset-2">
                      {segment.text}
                    </mark>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
      {page.nextCursor ? (
        <div className="mt-4">
          <Button asChild variant="secondary">
            <Link href={buildHref(q, { testament, livre, curseur: page.nextCursor })}>{t("more")}</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default async function BibleSearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getTranslations("bible.search");
  const tBible = await getTranslations("bible");
  const { q, testament, livre, curseur } = searchQuerySchema.parse(await searchParams);
  const translation = await getTranslation();
  if (!translation) return <EmptyState icon={BookOpen} title={tBible("emptyTitle")} body={tBible("emptyBody")} />;
  const books = await getCatalog(translation);

  const parsed = q ? parseReference(q, books) : null;
  if (parsed?.ok) {
    const path = referencePath(books, parsed.reference);
    if (path) redirect(path);
  }
  const referenceError = parsed && !parsed.ok ? parsed.error : null;
  const isFullText = q.length > 0 && (referenceError === null || referenceError.code === "NOT_A_REFERENCE" || referenceError.code === "UNKNOWN_BOOK");

  let rateLimited = false;
  let page: SearchPage | null = null;
  if (isFullText) {
    const [actor, context] = await Promise.all([getActor(), getRequestContext()]);
    const subject = actor?.userId ?? context.ip;
    rateLimited = subject ? !(await consumeRateLimit("bible.search", subject)).allowed : false;
    if (!rateLimited) page = await searchBible(translation, books, { query: q, testament, bookId: livre, cursor: curseur });
  }

  return (
    <>
      <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
      <form action="/bible/recherche" method="get" role="search" className="mt-5">
        <Label htmlFor="bible-search">{t("label")}</Label>
        <div className="mt-1.5 flex gap-2">
          <Input id="bible-search" name="q" type="search" defaultValue={q} placeholder={t("placeholder")} maxLength={200} aria-describedby="bible-search-hint" className="min-w-0 flex-1" />
          <Button type="submit">{t("submit")}</Button>
        </div>
        <p id="bible-search-hint" className="mt-1.5 text-sm text-muted">
          {t("hint")}
        </p>
      </form>

      {referenceError ? <ReferenceHelp error={referenceError} books={books} /> : null}
      {rateLimited ? (
        <p role="alert" className="mt-6 text-danger">
          {t("rateLimited")}
        </p>
      ) : null}
      {page?.tooCommon ? <EmptyState icon={SearchX} title={t("tooCommonTitle")} body={t("tooCommonBody")} /> : null}
      {page && !page.tooCommon ? <Results page={page} q={q} testament={testament} livre={livre} /> : null}
      {!q ? <EmptyState icon={BookOpen} title={t("idleTitle")} body={t("idleBody")} /> : null}
      {page && page.hits.length > 0 ? <p className="mt-6 text-sm text-muted">{translation.attribution}</p> : null}
    </>
  );
}
