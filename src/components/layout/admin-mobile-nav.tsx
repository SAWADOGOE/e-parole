"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar, type ADMIN_NAV } from "./admin-nav";

type Key = (typeof ADMIN_NAV)[number]["key"];

/** Sous 1024 px, la sidebar d'administration s'ouvre dans un panneau latéral. */
export function AdminMobileNav({ allowed }: { allowed: readonly Key[] }) {
  const t = useTranslations();
  return (
    <Sheet>
      <SheetTrigger className="inline-flex size-11 items-center justify-center rounded-md hover:bg-bg-subtle lg:hidden">
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">{t("common.openMenu")}</span>
      </SheetTrigger>
      <SheetContent side="left" closeLabel={t("common.close")} className="bg-brand p-0">
        <SheetTitle className="sr-only">{t("admin.navLabel")}</SheetTitle>
        <AdminSidebar allowed={allowed} />
      </SheetContent>
    </Sheet>
  );
}
