"use client";

import { BookOpen, ChevronsLeft, ChevronsRight, Flag, LayoutDashboard, ScrollText, Settings, Users, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { cn } from "@/lib/cn";

interface AdminNavItem {
  href: Route | null;
  key: "dashboard" | "users" | "moderation" | "bible" | "auditLogs" | "settings";
  icon: LucideIcon;
  phase?: number;
}

/** Les sections affichées sont filtrées côté serveur selon les permissions (confort, pas sécurité). */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/users", key: "users", icon: Users },
  { href: null, key: "moderation", icon: Flag, phase: 3 },
  { href: "/admin/bible", key: "bible", icon: BookOpen },
  { href: "/admin/audit-logs", key: "auditLogs", icon: ScrollText },
  { href: null, key: "settings", icon: Settings, phase: 5 },
];

const STORAGE_KEY = "eparole-admin-sidebar";

export function AdminSidebar({ allowed }: { allowed: readonly AdminNavItem["key"][] }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [stored, setStored] = useStoredPreference(STORAGE_KEY);
  const collapsed = stored === "1";

  function toggle() {
    setStored(collapsed ? "0" : "1");
  }

  return (
    <nav
      aria-label={t("navLabel")}
      className={cn("flex h-full flex-col bg-brand text-brand-fg transition-[width] duration-(--motion-base)", collapsed ? "w-[72px]" : "w-60")}
    >
      <ul className="flex flex-1 flex-col gap-1 p-3">
        {ADMIN_NAV.filter((item) => allowed.includes(item.key)).map(({ href, key, icon: Icon, phase }) => {
          const active = href !== null && (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
          const content = (
            <>
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className={cn("truncate", collapsed && "sr-only")}>{t(key)}</span>
              {phase && !collapsed ? (
                <span className="ml-auto rounded-full border border-gold/60 px-2 text-[11px] text-gold">
                  {t("phaseLater", { phase })}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={key}>
              {href ? (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm",
                    active ? "bg-brand-fg/15 font-semibold" : "hover:bg-brand-fg/10",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span aria-disabled="true" className="flex h-11 items-center gap-3 rounded-md px-3 text-sm opacity-70">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="m-3 flex h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-brand-fg/10"
      >
        {collapsed ? <ChevronsRight aria-hidden="true" className="size-5" /> : <ChevronsLeft aria-hidden="true" className="size-5" />}
        <span className={cn(collapsed && "sr-only")}>{collapsed ? t("expand") : t("collapse")}</span>
      </button>
    </nav>
  );
}
