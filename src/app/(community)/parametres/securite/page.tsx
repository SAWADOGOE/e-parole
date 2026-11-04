import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/shared/form-field";
import { SessionsList, type SessionView } from "@/features/auth/components/sessions-list";
import { TwoFactorSetup } from "@/features/auth/components/two-factor-setup";
import { listOwnSessions } from "@/features/auth";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("security");
  return { title: t("metaTitle") };
}

export default async function SecuritySettingsPage(props: PageProps<"/parametres/securite">) {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/parametres/securite");
  const t = await getTranslations("security");
  const params = await props.searchParams;
  const mfaRequired = params["mfa"] === "requis" && !session.actor.twoFactorEnabled;
  const views: SessionView[] = await listOwnSessions(session.actor.userId);

  return (
    <>
      <h1 className="mb-6 font-serif text-display-md text-fg">{t("title")}</h1>
      {mfaRequired ? (
        <div className="mb-6">
          <FormAlert message={t("mfaRequired")} />
        </div>
      ) : null}
      <TwoFactorSetup enabled={session.actor.twoFactorEnabled} />
      <SessionsList sessions={views} currentSessionId={session.sessionId} />
    </>
  );
}
