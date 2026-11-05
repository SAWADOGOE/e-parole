import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { listTranslationsForAdmin } from "@/features/bible";
import { TranslationControl } from "@/features/bible/components/translation-control";
import { requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminBible");
  return { title: t("translations") };
}

export default async function AdminBibleTranslationsPage() {
  const session = await requireAdminPage();
  if (!can(session.actor, "bible:translation:read")) notFound();
  const t = await getTranslations("adminBible");
  const tAdmin = await getTranslations("admin");
  const format = await getFormatter();
  const translations = await listTranslationsForAdmin();
  const canPublish = can(session.actor, "bible:translation:publish");
  const canActivate = can(session.actor, "bible:import");
  const day = (value: Date): string => format.dateTime(value, { dateStyle: "medium" });

  return (
    <>
      <Breadcrumbs items={[{ label: tAdmin("metaTitle"), href: "/admin" }, { label: t("title") }, { label: t("translations") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("translations")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("translationsIntro")}</p>

      {translations.length === 0 ? <EmptyState icon={BookOpen} title={t("emptyTitle")} body={t("emptyBody")} /> : null}

      {translations.map((translation) => (
        <section key={translation.id} aria-labelledby={`translation-${translation.id}`} className="mt-8 rounded-lg border bg-bg-elevated p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`translation-${translation.id}`} className="text-xl font-semibold text-fg">
              {translation.name} <span className="text-sm font-normal text-muted">({translation.code})</span>
            </h2>
            <div className="flex items-center gap-2">
              <Badge tone={translation.isPublished ? "accent" : "neutral"}>{t(translation.isPublished ? "published" : "unpublished")}</Badge>
              {canPublish ? <TranslationControl kind="publish" translationId={translation.id} published={translation.isPublished} name={translation.name} /> : null}
            </div>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">{t("license")}</dt>
            <dd className="min-w-0 break-words text-fg">
              {translation.licenseType} — {translation.licenseUrl}
            </dd>
            <dt className="text-muted">{t("attribution")}</dt>
            <dd className="text-fg">{translation.attribution}</dd>
            <dt className="text-muted">{t("source")}</dt>
            <dd className="min-w-0 break-words text-fg">{translation.sourceUrl}</dd>
            <dt className="text-muted">{t("retrievedAt")}</dt>
            <dd className="text-fg">{day(translation.sourceRetrievedAt)}</dd>
            <dt className="text-muted">{t("evidence")}</dt>
            <dd className="min-w-0 font-mono text-xs break-all text-fg">{translation.licenseEvidence}</dd>
          </dl>

          <h3 className="mt-6 text-sm font-semibold text-fg">{t("versions")}</h3>
          <ul className="mt-2 divide-y">
            {translation.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                    {t("versionId")} {version.id}
                    <Badge tone={version.status === "ACTIVE" ? "accent" : "neutral"}>{t(`status${version.status}`)}</Badge>
                  </p>
                  <p className="mt-1 text-muted tabular-nums">
                    {t("books")} {format.number(version.bookCount)} · {t("chapters")} {format.number(version.chapterCount)} · {t("verses")} {format.number(version.verseCount)} ·{" "}
                    {t("importedAt")} {day(version.importedAt)}
                  </p>
                  <p className="mt-1 font-mono text-xs break-all text-muted">
                    {t("checksum")} {version.checksum}
                  </p>
                </div>
                {canActivate && version.status !== "ACTIVE" ? <TranslationControl kind="activate" versionId={version.id} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
