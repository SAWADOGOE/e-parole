import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export interface Crumb {
  label: string;
  href?: Route;
}

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations("admin");
  return (
    <nav aria-label={t("breadcrumbLabel")} className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="underline-offset-4 hover:text-fg hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-fg" : undefined}>
                  {item.label}
                </span>
              )}
              {!last ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
