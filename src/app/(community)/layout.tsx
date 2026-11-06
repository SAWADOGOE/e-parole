import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DailyVerseCard } from "@/features/bible/components/daily-verse-card";
import { listManagedCommunities } from "@/features/communities";
import { unreadCountFor } from "@/features/notifications";
import { isDataSaver } from "@/server/data-saver";
import { getCurrentSession } from "@/server/auth/session";

export default async function CommunityLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  const [managed, unread, dataSaver] = session
    ? await Promise.all([listManagedCommunities(session.actor.userId), unreadCountFor(session.actor), isDataSaver()])
    : [[], 0, false];
  const firstManaged = managed[0];

  return (
    <AppShell
      account={
        session
          ? {
              displayName: session.displayName,
              handle: session.handle,
              email: session.email,
              emailVerified: session.actor.emailVerified,
              showAdmin: session.actor.globalRoles.length > 0,
              manageHref: firstManaged ? `/manage/${firstManaged.id}` : null,
              unreadNotifications: unread,
              dataSaver,
            }
          : null
      }
      aside={<DailyVerseCard headingId="verset-du-jour" />}
    >
      {children}
    </AppShell>
  );
}
