import { UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { requireCommunityManager } from "@/features/communities";

export default async function ManageDashboardPage(props: PageProps<"/manage/[communityId]">) {
  const { communityId } = await props.params;
  // Revérification à chaque page : le layout n'est pas une frontière de sécurité.
  await requireCommunityManager(communityId);
  const t = await getTranslations("manage");
  return <EmptyState icon={UsersRound} title={t("emptyTitle")} body={t("emptyBody")} />;
}
