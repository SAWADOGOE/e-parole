import { Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/server/auth/session";
import { isDataSaver } from "@/server/data-saver";
import { profilePath } from "../lib/paths";
import { relationList } from "../server/feeds";
import { getProfile } from "../server/profiles";
import { PeopleList } from "./people-list";

/** Abonnés ou abonnements d'un profil visible ; profils non découvrables et comptes bloqués exclus de la liste. */
export async function RelationPage({ handle, kind, cursor }: { handle: string; kind: "followers" | "following"; cursor: string | undefined }) {
  const session = await getCurrentSession();
  const section = kind === "followers" ? "abonnes" : "abonnements";
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(`/@${handle}/${section}`)}`);
  if (!/^[A-Za-z0-9_]{3,30}$/.test(handle)) notFound();
  const profile = await getProfile(session.actor, handle);
  if (!profile) notFound();
  const page = await relationList(session.actor, profile.userId, kind, cursor);
  if (!page) notFound();
  const t = await getTranslations("people");
  const dataSaver = await isDataSaver();
  return (
    <>
      <p>
        <Link href={profilePath(profile.handle)} className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">
          ← {t("backToProfile", { name: profile.displayName })}
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-display-sm break-words text-fg">{t(kind === "followers" ? "followersTitle" : "followingTitle", { name: profile.displayName })}</h1>
      <div className="mt-6">
        {page.items.length === 0 ? (
          <EmptyState icon={Users} title={t(kind === "followers" ? "followersTitle" : "followingTitle", { name: profile.displayName })} body={t(kind === "followers" ? "followersEmpty" : "followingEmpty")} />
        ) : (
          <PeopleList people={page.items} viewerId={session.actor.userId} dataSaver={dataSaver} />
        )}
      </div>
      {page.nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={`/@${profile.handle}/${section}?curseur=${encodeURIComponent(page.nextCursor)}` as Route}>{t("more")}</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
