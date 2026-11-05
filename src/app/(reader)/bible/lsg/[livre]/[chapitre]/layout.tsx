import type { ReactNode } from "react";
import { assertCanonicalChapter } from "@/features/bible";

/** Valide l'URL avant le début du flux : voir assertCanonicalChapter. */
export default async function ChapterLayout({ children, params }: { children: ReactNode; params: Promise<{ livre: string; chapitre: string }> }) {
  const { livre, chapitre } = await params;
  await assertCanonicalChapter(livre, chapitre);
  return children;
}
