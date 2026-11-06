import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { MediaPicture } from "@/features/media/components/media-picture";
import { profilePath } from "../lib/paths";
import type { ProfileFieldName, ProfileView } from "../types";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";
import { ProfileMenu } from "./profile-menu";

const FIELD_LABEL: Record<ProfileFieldName, "churchLabel" | "cityLabel" | "countryLabel" | "denominationLabel"> = {
  church: "churchLabel",
  city: "cityLabel",
  country: "countryLabel",
  denomination: "denominationLabel",
};

/** En-tête de profil : seuls les champs autorisés pour ce lecteur sont reçus du serveur (visibilité par champ). */
export async function ProfileHeader({ profile, dataSaver }: { profile: ProfileView; dataSaver: boolean }) {
  const t = await getTranslations("people");
  const tProfile = await getTranslations("profile");
  const tSocial = await getTranslations("social");
  const format = await getFormatter();
  const fields = (Object.entries(profile.fields) as [ProfileFieldName, NonNullable<ProfileView["fields"][ProfileFieldName]>][]).filter(([, value]) => value.value);

  return (
    <header>
      {profile.banner && !dataSaver ? (
        <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-lg">
          <MediaPicture image={profile.banner} alt="" sizes="(min-width: 768px) 640px, 100vw" className="aspect-[3/1] rounded-none sm:rounded-lg" />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.displayName} image={profile.avatar} size="lg" dataSaver={dataSaver} />
          <div className="min-w-0">
            <h1 className="font-serif text-display-sm break-words text-fg">{profile.displayName}</h1>
            <p className="break-all text-muted">@{profile.handle}</p>
            {profile.verifiedBadge ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gold-fg">
                <BadgeCheck aria-hidden="true" className="size-4" />
                {tSocial(`verified.${profile.verifiedBadge}`)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.relation.isSelf ? (
            <Button asChild variant="secondary">
              <Link href="/profil">{t("editProfile")}</Link>
            </Button>
          ) : (
            <>
              <FollowButton userId={profile.userId} name={profile.displayName} following={profile.relation.following} />
              <ProfileMenu userId={profile.userId} name={profile.displayName} muted={profile.relation.muted} />
            </>
          )}
        </div>
      </div>
      {profile.bio ? <p className="mt-4 text-lg break-words whitespace-pre-line text-fg">{profile.bio}</p> : null}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <li className="text-muted">{t("posts", { count: profile.counts.posts })}</li>
        <li>
          <Link href={profilePath(profile.handle, "abonnes")} className="text-accent underline-offset-4 hover:underline">
            {t("followers", { count: profile.counts.followers })}
          </Link>
        </li>
        <li>
          <Link href={profilePath(profile.handle, "abonnements")} className="text-accent underline-offset-4 hover:underline">
            {t("followingCount", { count: profile.counts.following })}
          </Link>
        </li>
        {profile.relation.followedBy ? <li className="text-muted">{t("followsYou")}</li> : null}
        <li className="text-muted">{t("joined", { date: format.dateTime(profile.joinedAt, { month: "long", year: "numeric" }) })}</li>
      </ul>
      {fields.length > 0 ? (
        <dl className="mt-4 grid gap-x-6 gap-y-2 border-y py-3 text-sm sm:grid-cols-2">
          {fields.map(([name, field]) => (
            <div key={name} className="min-w-0">
              <dt className="text-muted">{tProfile(FIELD_LABEL[name])}</dt>
              <dd className="break-words text-fg">
                {field.value}
                {profile.relation.isSelf ? <span className="block text-xs text-muted">{t("visibleTo", { audience: tProfile(`visibility.${field.visibility}`) })}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
