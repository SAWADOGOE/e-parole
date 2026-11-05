import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminSidebar, type ADMIN_NAV } from "@/components/layout/admin-nav";
import { AccountMenu } from "@/components/layout/account-menu";
import { Wordmark } from "@/components/shared/logo";
import { requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: { default: t("metaTitle"), template: `%s · ${t("metaTitle")}` } };
}

type Key = (typeof ADMIN_NAV)[number]["key"];

/**
 * Layout /admin : 404 pour tout non-admin, MFA exigée.
 * Ce n'est pas une frontière de sécurité : chaque page et chaque action revérifient leurs permissions.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  const t = await getTranslations();
  const actor = session.actor;
  const allowed: Key[] = ["dashboard"];
  if (can(actor, "user:read:admin", { linkedToCase: false })) allowed.push("users");
  if (can(actor, "moderation:case:read")) allowed.push("moderation");
  if (can(actor, "bible:translation:read")) allowed.push("bible");
  if (can(actor, "audit:read", { auditActorId: actor.userId })) allowed.push("auditLogs");
  if (can(actor, "settings:read")) allowed.push("settings");
  const env = process.env["APP_ENV"] ?? "development";

  return (
    <div className="flex min-h-dvh bg-bg">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("common.skipToContent")}
      </a>
      <div className="sticky top-0 hidden h-dvh lg:block">
        <AdminSidebar allowed={allowed} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {env !== "production" ? (
          <p className="bg-gold px-4 py-1 text-center text-xs font-semibold text-brand">
            {t("admin.environment", { env })}
          </p>
        ) : null}
        <header className="sticky top-0 z-30 flex h-(--header-height) items-center justify-between gap-3 border-b bg-bg/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <AdminMobileNav allowed={allowed} />
            <Link href="/admin" className="rounded-md">
              <Wordmark />
            </Link>
            <span className="hidden text-sm font-semibold text-muted sm:inline">{t("admin.metaTitle")}</span>
          </div>
          <AccountMenu displayName={session.displayName} handle={session.handle} showAdmin={false} manageHref={null} />
        </header>
        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
