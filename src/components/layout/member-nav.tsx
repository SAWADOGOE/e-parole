"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isActive, MEMBER_NAV } from "./member-nav-items";

const VARIANTS = {
  /** Barre inférieure mobile (< 768 px), 5 onglets, zone de sécurité iOS. */
  bottom: {
    nav: "fixed inset-x-0 bottom-0 z-40 border-t bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden",
    list: "mx-auto grid h-(--bottom-nav-height) max-w-lg grid-cols-5",
    link: "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
    active: "text-brand",
    idle: "text-muted",
    label: "",
  },
  /** Rail (768–1023 px) puis barre latérale avec libellés (≥ 1024 px). */
  side: {
    nav: "hidden md:block",
    list: "flex flex-col gap-1",
    link: "flex h-12 items-center justify-center gap-3 rounded-md px-3 text-base transition-colors lg:justify-start",
    active: "bg-accent-subtle font-semibold text-brand",
    idle: "text-fg hover:bg-bg-subtle",
    label: "sr-only lg:not-sr-only",
  },
} as const;

function MemberNav({ variant }: { variant: keyof typeof VARIANTS }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const style = VARIANTS[variant];
  return (
    <nav aria-label={t("mainLabel")} className={style.nav}>
      <ul className={style.list}>
        {MEMBER_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`${style.link} ${active ? style.active : style.idle}`}>
                <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className={style.label}>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  return <MemberNav variant="bottom" />;
}

export function SideNav() {
  return <MemberNav variant="side" />;
}
