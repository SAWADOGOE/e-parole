import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminBibleTabs } from "@/features/bible/components/admin-bible-tabs";
import { recordDeniedAccess, requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

/** Confort de navigation seulement : chaque page et chaque action revérifient leur permission. */
export default async function AdminBibleLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  if (!can(session.actor, "bible:translation:read")) {
    await recordDeniedAccess(session.actor, "security.admin_access_denied", "route", "/admin/bible");
    notFound();
  }
  return (
    <>
      <AdminBibleTabs />
      {children}
    </>
  );
}
