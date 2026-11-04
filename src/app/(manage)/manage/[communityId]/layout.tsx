import { LayoutDashboard, Settings, ShieldAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { requireCommunityManager } from "@/features/communities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("manage");
  return { title: { default: t("metaTitle"), template: `%s · ${t("metaTitle")}` } };
}

/** Espace responsable : 404 si la communauté n'existe pas ou n'est pas gérée par l'acteur. */
export default async function ManageLayout({ children, params }: LayoutProps<"/manage/[communityId]">) {
  const { communityId } = await params;
  const scope = await requireCommunityManager(communityId);
  const t = await getTranslations();
  const items = [
    { key: "dashboard", icon: LayoutDashboard },
    { key: "members", icon: Users },
    { key: "moderation", icon: ShieldAlert },
    { key: "settings", icon: Settings },
  ] as const;

  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("common.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-(--header-height) max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="rounded-md">
            <Wordmark />
          </Link>
          <span className="truncate text-sm font-semibold text-muted">{t("manage.title")}</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-display-sm text-fg">{scope.community.name}</h1>
          <Badge tone="neutral">{scope.membership.role}</Badge>
        </div>
        <nav aria-label={t("manage.navLabel")} className="mt-4 -mx-4 overflow-x-auto px-4">
          <ul className="flex gap-1 border-b">
            {items.map(({ key, icon: Icon }, index) => (
              <li key={key}>
                <span
                  aria-current={index === 0 ? "page" : undefined}
                  aria-disabled={index === 0 ? undefined : "true"}
                  className={
                    index === 0
                      ? "flex h-11 items-center gap-2 border-b-2 border-accent px-3 text-sm font-semibold text-fg"
                      : "flex h-11 items-center gap-2 px-3 text-sm text-muted"
                  }
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {t(`manage.${key}`)}
                </span>
              </li>
            ))}
          </ul>
        </nav>
        <main id="contenu" tabIndex={-1} className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
