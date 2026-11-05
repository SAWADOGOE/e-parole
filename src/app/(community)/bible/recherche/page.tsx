import { BookOpen, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCatalog, getTranslation, searchBible, searchQuerySchema } from "@/features/bible";
import { ReferenceHelp, referencePath } from "@/features/bible/components/reference-help";
import { SearchResults } from "@/features/bible/components/search-results";
import { parseReference } from "@/features/bible/lib/parse-reference";
import type { SearchPage } from "@/features/bible/types";
import { getActor } from "@/server/auth/session";
import { consumeRateLimit } from "@/server/rate-limit/rate-limit";
import { getRequestContext } from "@/server/request-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bible.search");
  return { title: t("metaTitle") };
}

type Params = Record<string, string | string[] | undefined>;

export default async function BibleSearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getTranslations("bible.search");
  const tBible = await getTranslations("bible");
  const { q, testament, livre, curseur } = searchQuerySchema.parse(await searchParams);
  const translation = await getTranslation();
  if (!translation) return <EmptyState icon={BookOpen} title={tBible("emptyTitle")} body={tBible("emptyBody")} />;
  const books = await getCatalog(translation);

  const parsed = q ? parseReference(q, books) : null;
  // Un nom de livre seul (« Psaume », « Nombres ») est aussi un mot courant : il garde sa recherche, avec un lien vers le livre.
  const wholeBook = parsed?.ok && parsed.reference.wholeBook ? parsed.reference : null;
  if (parsed?.ok && !wholeBook) {
    const path = referencePath(books, parsed.reference);
    if (path) redirect(path);
  }
  const wholeBookPath = wholeBook ? referencePath(books, wholeBook) : null;
  const referenceError = parsed && !parsed.ok ? parsed.error : null;
  const isFullText = q.length > 0 && (referenceError === null || referenceError.code === "NOT_A_REFERENCE" || referenceError.code === "UNKNOWN_BOOK");

  let rateLimited = false;
  let page: SearchPage | null = null;
  if (isFullText) {
    const [actor, context] = await Promise.all([getActor(), getRequestContext()]);
    // Sans IP de confiance (proxy mal configuré), tous les anonymes partagent un compartiment : la limite ne disparaît jamais.
    rateLimited = !(await consumeRateLimit("bible.search", actor?.userId ?? context.ip ?? "anonymous")).allowed;
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

      {referenceError && !rateLimited ? <ReferenceHelp error={referenceError} books={books} /> : null}
      {wholeBook && wholeBookPath ? (
        <p className="mt-4">
          <Link href={wholeBookPath} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            {t("openBook", { book: books.find((book) => book.id === wholeBook.bookId)?.name ?? "" })}
          </Link>
        </p>
      ) : null}
      {rateLimited ? (
        <p role="alert" className="mt-6 text-danger">
          {t("rateLimited")}
        </p>
      ) : null}
      {page?.tooCommon ? <EmptyState icon={SearchX} title={t("tooCommonTitle")} body={t("tooCommonBody")} /> : null}
      {page && !page.tooCommon ? <SearchResults page={page} q={q} testament={testament} livre={livre} /> : null}
      {!q ? <EmptyState icon={BookOpen} title={t("idleTitle")} body={t("idleBody")} /> : null}
      {page && page.hits.length > 0 ? <p className="mt-6 text-sm text-muted">{translation.attribution}</p> : null}
    </>
  );
}
