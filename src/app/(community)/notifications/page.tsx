import { Bell } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { notificationListQuerySchema, notificationsFor } from "@/features/notifications";
import { MarkRead } from "@/features/notifications/components/mark-read";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("metaTitle") };
}

/** Notifications in-app regroupées (REQ-NOTIF-1). */
export default async function NotificationsPage(props: PageProps<"/notifications">) {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/notifications");
  const query = notificationListQuerySchema.parse(await props.searchParams);
  const seenAt = new Date().toISOString();
  const page = await notificationsFor(session.actor, query.curseur);
  const t = await getTranslations("notifications");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
        <Button asChild variant="secondary" size="sm">
          <Link href="/parametres/notifications">{t("preferencesLink")}</Link>
        </Button>
      </div>
      {page.items.length === 0 ? (
        <EmptyState icon={Bell} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <ul className="mt-6 divide-y border-y">
          {page.items.map((row) => (
            <li key={row.id}>
              <NotificationItem row={row} />
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={`/notifications?curseur=${encodeURIComponent(page.nextCursor)}` as Route}>{t("more")}</Link>
          </Button>
        </div>
      ) : null}
      {page.items.some((row) => !row.read) ? <MarkRead before={seenAt} /> : null}
    </>
  );
}
