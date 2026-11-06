import { Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { peopleSearchSchema, searchPeople } from "@/features/social";
import { PeopleList } from "@/features/social/components/people-list";
import { getCurrentSession } from "@/server/auth/session";
import { isDataSaver } from "@/server/data-saver";
import { enforceRateLimit } from "@/server/rate-limit/rate-limit";
import { isAppError } from "@/server/errors/app-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people");
  return { title: t("metaTitle") };
}

/** Recherche de membres : seuls les profils découvrables, jamais un compte bloqué dans un sens ou dans l'autre. */
export default async function PeoplePage(props: PageProps<"/membres">) {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/membres");
  const query = peopleSearchSchema.parse(await props.searchParams);
  const t = await getTranslations("people");
  const tErrors = await getTranslations("errors.codes");
  let limited = false;
  let page = { items: [] as Awaited<ReturnType<typeof searchPeople>>["items"], nextCursor: null as string | null };
  if (query.q.length >= 2) {
    try {
      await enforceRateLimit("profile.search", session.actor.userId);
      page = await searchPeople(session.actor, query.q, query.curseur);
    } catch (error: unknown) {
      if (!isAppError(error) || error.code !== "RATE_LIMITED") throw error;
      limited = true;
    }
  }
  const dataSaver = await isDataSaver();

  return (
    <>
      <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("intro")}</p>
      <form role="search" action="/membres" className="mt-6 flex gap-2">
        <label htmlFor="recherche-membres" className="sr-only">
          {t("searchLabel")}
        </label>
        <Input id="recherche-membres" name="q" defaultValue={query.q} maxLength={60} placeholder={t("searchLabel")} />
        <Button type="submit" variant="secondary">
          {t("searchSubmit")}
        </Button>
      </form>
      <div className="mt-6">
        {limited ? <p className="text-danger">{tErrors("RATE_LIMITED")}</p> : null}
        {query.q.length > 0 && query.q.length < 2 ? <p className="text-muted">{t("tooShort")}</p> : null}
        {query.q.length >= 2 && !limited && page.items.length === 0 ? <EmptyState icon={Search} title={t("title")} body={t("empty")} /> : null}
        {page.items.length > 0 ? <PeopleList people={page.items} viewerId={session.actor.userId} dataSaver={dataSaver} /> : null}
      </div>
      {page.nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={`/membres?q=${encodeURIComponent(query.q)}&curseur=${encodeURIComponent(page.nextCursor)}` as Route}>{t("more")}</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
