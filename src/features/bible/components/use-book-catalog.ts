"use client";

import { useEffect, useState } from "react";
import type { BookSummary } from "../types";

export type SelectorBook = BookSummary & { abbreviations: readonly string[] };

/** Liste des livres, chargée à l'ouverture du sélecteur : rien dans la charge initiale du lecteur. */
export function useBookCatalog(): { books: SelectorBook[] | null; failed: boolean } {
  const [books, setBooks] = useState<SelectorBook[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/bible/books")
      .then(async (response) => {
        if (!response.ok) throw new Error("books");
        return (await response.json()) as { books: SelectorBook[] };
      })
      .then((body) => {
        if (active) setBooks(body.books);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { books, failed };
}
