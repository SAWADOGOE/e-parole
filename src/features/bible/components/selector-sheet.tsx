"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { chapterPath } from "../lib/format";
import { suggestBooks } from "../lib/parse-reference";
import { ReaderSheet } from "./reader-sheet";
import { useBookCatalog, type SelectorBook } from "./use-book-catalog";

const FIELD_ID = "bible-reference-input";

export default function SelectorSheet({ currentBookId, onClose }: { currentBookId: string; onClose: () => void }) {
  const t = useTranslations("bible.selector");
  const { books, failed } = useBookCatalog();
  const [opened, setOpened] = useState<SelectorBook | null>(null);
  const [query, setQuery] = useState("");
  const chaptersTitle = useRef<HTMLHeadingElement>(null);
  const firstBook = useRef<HTMLHeadingElement>(null);

  // Le bouton activé disparaît avec la vue : le focus suit vers la vue suivante au lieu de retomber sur le dialogue.
  function open(book: SelectorBook | null): void {
    setOpened(book);
    requestAnimationFrame(() => (book ? chaptersTitle : firstBook).current?.focus());
  }

  const suggestions = useMemo(() => {
    if (!books || !/^[^\d]*[a-zà-ÿ]{2,}$/i.test(query.trim())) return [];
    const ids = suggestBooks(query, books.map((book) => ({ ...book, verseCounts: {} })));
    return ids.flatMap((id) => books.filter((book) => book.id === id));
  }, [books, query]);

  const grid = (list: readonly SelectorBook[]) => (
    <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
      {list.map((book) => (
        <li key={book.id}>
          <button
            type="button"
            aria-current={book.id === currentBookId ? "true" : undefined}
            onClick={() => open(book)}
            className="flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm text-fg hover:bg-bg-subtle aria-[current]:bg-accent-subtle aria-[current]:font-semibold"
          >
            {book.name}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <ReaderSheet title={t("title")} onClose={onClose}>
      <form action="/bible/recherche" method="get" className="flex flex-col gap-1.5">
        <Label htmlFor={FIELD_ID}>{t("referenceLabel")}</Label>
        <div className="flex gap-2">
          <Input
            id={FIELD_ID}
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("referencePlaceholder")}
            autoComplete="off"
            enterKeyHint="go"
            maxLength={200}
            className="min-w-0 flex-1"
          />
          <Button type="submit">{t("referenceSubmit")}</Button>
        </div>
      </form>

      {suggestions.length > 0 ? (
        <section aria-label={t("suggestions")}>
          <ul className="flex flex-wrap gap-1">
            {suggestions.map((book) => (
              <li key={book.id}>
                <button type="button" onClick={() => open(book)} className="inline-flex h-11 items-center rounded-full border px-3 text-sm text-fg hover:bg-bg-subtle">
                  {book.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("loadError")}
        </p>
      ) : null}
      {!books && !failed ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : null}

      {books && opened ? (
        <section aria-labelledby="selector-chapters">
          <button type="button" onClick={() => open(null)} className="mb-2 inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-accent hover:bg-bg-subtle">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToBooks")}
          </button>
          <h3 ref={chaptersTitle} id="selector-chapters" tabIndex={-1} className="mb-2 text-sm font-semibold text-muted">
            {t("chaptersOf", { book: opened.name })}
          </h3>
          <ul className="grid grid-cols-6 gap-1">
            {Array.from({ length: opened.chapterCount }, (_, index) => index + 1).map((chapter) => (
              <li key={chapter}>
                <Link
                  href={chapterPath(opened.slug, chapter)}
                  onClick={onClose}
                  aria-label={t("chapterLabel", { book: opened.name, chapter })}
                  className="flex size-11 items-center justify-center rounded-md border text-sm text-fg hover:bg-bg-subtle"
                >
                  {chapter}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {books && !opened ? (
        <>
          <section aria-labelledby="selector-ot">
            <h3 ref={firstBook} id="selector-ot" tabIndex={-1} className="mb-2 text-sm font-semibold text-muted">
              {t("oldTestament")}
            </h3>
            {grid(books.filter((book) => book.testament === "OT"))}
          </section>
          <section aria-labelledby="selector-nt">
            <h3 id="selector-nt" className="mb-2 text-sm font-semibold text-muted">
              {t("newTestament")}
            </h3>
            {grid(books.filter((book) => book.testament === "NT"))}
          </section>
        </>
      ) : null}
    </ReaderSheet>
  );
}
