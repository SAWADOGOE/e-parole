import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ComposerPage } from "@/features/social/components/composer-page";
import { resolveSharedVerse } from "@/features/social";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("composer");
  return { title: t("metaTitle") };
}

/** Composer plein écran (onglet « Publier », bouton « Publier » du lecteur biblique avec ?verset=JHN.3.16-18). */
export default async function PublishPage(props: PageProps<"/publier">) {
  const session = await getCurrentSession();
  const params = await props.searchParams;
  const shared = typeof params["verset"] === "string" ? params["verset"] : null;
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(shared ? `/publier?verset=${shared}` : "/publier")}`);
  const t = await getTranslations("composer");
  const initialVerse = shared ? await resolveSharedVerse(shared) : null;
  return (
    <>
      <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
      <noscript>
        <p className="mt-4 text-muted">{t("noScript")}</p>
      </noscript>
      <div className="mt-8">
        <ComposerPage isMinor={session.actor.isMinor} initialVerse={initialVerse} />
      </div>
    </>
  );
}
