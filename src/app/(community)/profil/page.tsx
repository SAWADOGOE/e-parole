import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOwnProfile } from "@/features/social";
import { ProfileForm } from "@/features/social/components/profile-form";
import { ProfileImages } from "@/features/social/components/profile-images";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("metaTitle") };
}

/** Mon profil : édition (REQ-PROF-1, 2), liens vers mes réglages. L'email n'est jamais affiché à autrui. */
export default async function OwnProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/profil");
  const t = await getTranslations("profile");
  const profile = await getOwnProfile(session.actor);
  const links: { href: Route; label: string }[] = [
    { href: `/@${profile.handle}` as Route, label: t("viewPublic") },
    { href: "/favoris", label: t("bookmarksLink") },
    { href: "/parametres/confidentialite", label: t("privacyLink") },
    { href: "/parametres/notifications", label: t("notificationsLink") },
    { href: "/parametres/securite", label: t("securityLink") },
  ];
  return (
    <>
      <h1 className="font-serif text-display-md text-fg">{t("title")}</h1>
      <nav aria-label={t("title")} className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Button asChild variant="secondary" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <dl className="mt-6 border-y py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-sm text-muted">{t("emailLabel")}</dt>
          <dd className="flex items-center gap-2 font-medium break-all">
            {session.email}
            <Badge tone={session.actor.emailVerified ? "accent" : "warning"}>{session.actor.emailVerified ? t("verified") : t("notVerified")}</Badge>
          </dd>
        </div>
      </dl>
      <section aria-labelledby="images-profil" className="mt-8">
        <h2 id="images-profil" className="mb-3 text-xl font-semibold text-fg">
          {t("avatarTitle")} · {t("bannerTitle")}
        </h2>
        <ProfileImages hasAvatar={profile.avatar !== null} hasBanner={profile.banner !== null} />
      </section>
      <section aria-labelledby="edition-profil" className="mt-8">
        <h2 id="edition-profil" className="mb-4 text-xl font-semibold text-fg">
          {t("editTitle")}
        </h2>
        <ProfileForm profile={profile} />
      </section>
    </>
  );
}
