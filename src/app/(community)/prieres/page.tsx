import { HandHeart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/shared/coming-soon-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("prayers");
  return { title: t("metaTitle") };
}

export default function PrayersPage() {
  return <ComingSoonPage namespace="prayers" icon={HandHeart} />;
}
