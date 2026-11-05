import { BookOpen } from "lucide-react";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { DEFAULT_BOOK_SLUG, findReadingState, getCatalog, getTranslation } from "@/features/bible";
import { chapterPath } from "@/features/bible/lib/format";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bible");
  return { title: t("metaTitle") };
}

/** Reprend le dernier chapitre lu, ou Jean 1 pour un nouveau lecteur. */
export default async function BiblePage() {
  const t = await getTranslations("bible");
  const translation = await getTranslation();
  if (!translation) return <EmptyState icon={BookOpen} title={t("emptyTitle")} body={t("emptyBody")} verse={t("emptyVerse")} />;

  const session = await getCurrentSession();
  const state = session ? await findReadingState(session.actor.userId) : null;
  const books = await getCatalog(translation);
  const book = books.find((entry) => entry.id === state?.bookId);
  redirect(chapterPath(book?.slug ?? DEFAULT_BOOK_SLUG, (book && state?.chapter) ?? 1));
}
