import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/shared/coming-soon-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("communities");
  return { title: t("metaTitle") };
}

export default function CommunitiesPage() {
  return <ComingSoonPage namespace="communities" icon={UsersRound} />;
}
