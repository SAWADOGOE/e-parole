import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { recordDeniedAccess, requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

/** Confort de navigation seulement : chaque page et chaque action revérifient leur permission. */
export default async function AdminBibleLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  if (!can(session.actor, "bible:translation:read")) {
    await recordDeniedAccess(session.actor, "security.admin_access_denied", "route", "/admin/bible");
    notFound();
  }
  const t = await getTranslations("adminBible");
  const tab = "inline-flex min-h-11 items-center rounded-full border px-4 text-sm text-fg hover:bg-bg-subtle";
  return (
    <>
      <nav aria-label={t("tabsLabel")} className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/bible/translations" className={tab}>
          {t("translations")}
        </Link>
        <Link href="/admin/bible/daily-verses" className={tab}>
          {t("dailyVerses")}
        </Link>
      </nav>
      {children}
    </>
  );
}
