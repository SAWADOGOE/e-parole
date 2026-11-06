import type { ReactNode } from "react";
import { AdminBibleTabs } from "@/features/bible/components/admin-bible-tabs";
import { requireAdminPermission } from "@/server/auth/session";

/** Confort de navigation seulement : chaque page et chaque action revérifient leur permission. */
export default async function AdminBibleLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("bible:translation:read", "/admin/bible");
  return (
    <>
      <AdminBibleTabs />
      {children}
    </>
  );
}
