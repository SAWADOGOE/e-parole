import { SearchX } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { passagePath } from "../lib/format";
import type { SearchPage } from "../types";

function buildHref(q: string, filters: { testament?: string | undefined; livre?: string | undefined; curseur?: string | undefined }): Route {
  const params = new URLSearchParams({ q });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return `/bible/recherche?${params.toString()}` as Route;
}

const CHIP = "inline-flex min-h-11 items-center rounded-full border px-3 text-sm text-fg hover:bg-bg-subtle aria-[current]:border-accent aria-[current]:bg-accent-subtle aria-[current]:font-semibold";
const FACET = "inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline aria-[current]:font-semibold";

export async function SearchResults({ page, q, testament, livre }: { page: SearchPage; q: string; testament: string | undefined; livre: string | undefined }) {
  const t = await getTranslations("bible.search");
  return (
    <>
      <nav aria-label={t("filtersLabel")} className="mt-6 flex flex-wrap gap-2">
        <Link href={buildHref(q, {})} aria-current={!testament ? "true" : undefined} className={CHIP}>
          {t("all")}
        </Link>
        <Link href={buildHref(q, { testament: "OT" })} aria-current={testament === "OT" ? "true" : undefined} className={CHIP}>
          {t("ot")}
        </Link>
        <Link href={buildHref(q, { testament: "NT" })} aria-current={testament === "NT" ? "true" : undefined} className={CHIP}>
          {t("nt")}
        </Link>
      </nav>
      <p role="status" className="mt-4 text-sm text-muted">
        {t("resultCount", { count: page.total, query: q })} {page.total > 0 ? t("elapsed", { ms: page.elapsedMs }) : null}
      </p>
      {page.facets.length > 1 ? (
        <nav aria-label={t("facetsLabel")} className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href={buildHref(q, { testament })} aria-current={!livre ? "true" : undefined} className={FACET}>
            {t("allBooks")}
          </Link>
          {page.facets.map((facet) => (
            <Link key={facet.bookId} href={buildHref(q, { testament, livre: facet.bookId })} aria-current={livre === facet.bookId ? "true" : undefined} className={FACET}>
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
            <li key={hit.id} className="py-3">
              <Link href={passagePath(hit.bookSlug, hit.chapter, hit.verse)} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline">
                {hit.reference}
              </Link>
              <p lang="fr" className="font-serif text-lg break-words text-fg">
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
