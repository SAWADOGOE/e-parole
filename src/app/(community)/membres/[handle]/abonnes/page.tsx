import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RelationPage } from "@/features/social/components/relation-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people");
  return { title: t("metaTitle") };
}

export default async function FollowersPage(props: PageProps<"/membres/[handle]/abonnes">) {
  const { handle } = await props.params;
  const search = await props.searchParams;
  return <RelationPage handle={handle} kind="followers" cursor={typeof search["curseur"] === "string" ? search["curseur"] : undefined} />;
}
