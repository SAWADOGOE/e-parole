import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DailyVerseCard } from "@/features/bible/components/daily-verse-card";
import { listManagedCommunities } from "@/features/communities";
import { getCurrentSession } from "@/server/auth/session";

export default async function CommunityLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  const managed = session ? await listManagedCommunities(session.actor.userId) : [];
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
            }
          : null
      }
      aside={<DailyVerseCard headingId="verset-du-jour" />}
    >
      {children}
    </AppShell>
  );
}
