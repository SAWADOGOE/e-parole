import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { listOwnRelations, type RelationEntry } from "@/features/social";
import { RelationUndoButton } from "@/features/social/components/relation-undo-button";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("metaTitle") };
}

/** Personnes bloquées et en sourdine : listes strictement privées (US-14). */
export default async function PrivacyPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/parametres/confidentialite");
  const [blocked, muted] = await Promise.all([listOwnRelations(session.actor.userId, "block"), listOwnRelations(session.actor.userId, "mute")]);
  const t = await getTranslations("privacy");
  const format = await getFormatter();

  const list = (entries: RelationEntry[], kind: "block" | "mute", empty: string) =>
    entries.length === 0 ? (
      <p className="mt-3 text-muted">{empty}</p>
    ) : (
      <ul className="mt-3 divide-y border-y">
        {entries.map((entry) => (
          <li key={entry.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-medium break-words text-fg">{entry.displayName}</span>
              <span className="block text-sm text-muted">
                @{entry.handle} · {t("since", { date: format.dateTime(entry.since, { dateStyle: "medium" }) })}
              </span>
            </span>
            <RelationUndoButton kind={kind} userId={entry.userId} name={entry.displayName} />
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <h1 className="font-serif text-display-sm text-fg">{t("title")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("intro")}</p>
      <section aria-labelledby="bloques" className="mt-8">
        <h2 id="bloques" className="text-xl font-semibold text-fg">
          {t("blockedTitle")}
        </h2>
        {list(blocked, "block", t("blockedEmpty"))}
      </section>
      <section aria-labelledby="sourdine" className="mt-8">
        <h2 id="sourdine" className="text-xl font-semibold text-fg">
          {t("mutedTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("mutedIntro")}</p>
        {list(muted, "mute", t("mutedEmpty"))}
      </section>
      <p className="mt-8 text-sm text-muted">{t("discoverableLink")}</p>
    </>
  );
}
