import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/shared/coming-soon-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bible");
  return { title: t("metaTitle") };
}

export default function BiblePage() {
  return <ComingSoonPage namespace="bible" icon={BookOpen} />;
}
