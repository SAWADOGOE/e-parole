import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export async function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => Route;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("common");
  return (
    <nav aria-label={t("pageOf", { page, total: totalPages })} className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
          {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">{t("pageOf", { page, total: totalPages })}</span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
