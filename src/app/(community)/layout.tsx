import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { listManagedCommunities } from "@/features/communities";
import { getCurrentSession } from "@/server/auth/session";

export default async function CommunityLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  const t = await getTranslations("home");
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
      aside={
        <section aria-labelledby="verset-du-jour" className="border-l-[3px] border-gold pl-4">
          <h2 id="verset-du-jour" className="text-xs font-semibold tracking-[0.18em] text-gold-fg uppercase">
            {t("verseOfDayLabel")}
          </h2>
          <p className="mt-3 text-sm text-muted">{t("verseOfDayEmpty")}</p>
        </section>
      }
    >
      {children}
    </AppShell>
  );
}
