import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { preferencesFor } from "@/features/notifications";
import { PreferencesForm } from "@/features/notifications/components/preferences-form";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("preferencesTitle") };
}

export default async function NotificationPreferencesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/parametres/notifications");
  const t = await getTranslations("notifications");
  return (
    <>
      <h1 className="font-serif text-display-sm text-fg">{t("preferencesTitle")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("preferencesIntro")}</p>
      <div className="mt-6">
        <PreferencesForm initial={await preferencesFor(session.actor)} />
      </div>
    </>
  );
}
