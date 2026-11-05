"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/admin/bible/translations", label: "translations" },
  { href: "/admin/bible/daily-verses", label: "dailyVerses" },
] as const;

export function AdminBibleTabs() {
  const t = useTranslations("adminBible");
  const pathname = usePathname();
  return (
    <nav aria-label={t("tabsLabel")} className="mb-6 flex flex-wrap gap-2">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm text-fg hover:bg-bg-subtle aria-[current]:border-accent aria-[current]:bg-accent-subtle aria-[current]:font-semibold"
        >
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
