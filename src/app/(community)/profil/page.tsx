import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("metaTitle") };
}

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/profil");
  const t = await getTranslations("profile");
  return (
    <>
      <h1 className="font-serif text-display-md text-fg">{t("title")}</h1>
      <dl className="mt-8 divide-y border-y">
        <div className="flex flex-wrap justify-between gap-2 py-4">
          <dt className="text-sm text-muted">{t("handleLabel")}</dt>
          <dd className="font-medium">{session.handle ? `@${session.handle}` : "—"}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-4">
          <dt className="text-sm text-muted">{t("emailLabel")}</dt>
          <dd className="flex items-center gap-2 font-medium break-all">
            {session.email}
            <Badge tone={session.actor.emailVerified ? "accent" : "warning"}>
              {session.actor.emailVerified ? t("verified") : t("notVerified")}
            </Badge>
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-muted">{t("emptyBody")}</p>
      <Button asChild variant="secondary" className="mt-6">
        <Link href="/parametres/securite">{t("securityLink")}</Link>
      </Button>
    </>
  );
}
