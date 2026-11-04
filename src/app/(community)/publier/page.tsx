import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/shared/coming-soon-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("publish");
  return { title: t("metaTitle") };
}

export default function PublishPage() {
  return <ComingSoonPage namespace="publish" icon={PenLine} />;
}
