"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isActive, MEMBER_NAV } from "./member-nav-items";

/** Barre inférieure mobile (< 768 px), 5 onglets, zone de sécurité iOS. */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("mainLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-(--bottom-nav-height) max-w-lg grid-cols-5">
        {MEMBER_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium ${active ? "text-brand" : "text-muted"}`}
              >
                <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Rail (768–1023 px) puis barre latérale avec libellés (≥ 1024 px). */
export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("mainLabel")} className="hidden md:block">
      <ul className="flex flex-col gap-1">
        {MEMBER_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-12 items-center justify-center gap-3 rounded-md px-3 text-base transition-colors lg:justify-start ${active ? "bg-accent-subtle font-semibold text-brand" : "text-fg hover:bg-bg-subtle"}`}
              >
                <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className="sr-only lg:not-sr-only">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
