import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/shared/page-heading";
import { TwoFactorForm } from "@/features/auth/components/two-factor-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("twoFactorTitle") };
}

export default async function TwoFactorPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <PageHeading title={t("twoFactorTitle")} intro={t("twoFactorIntro")} />
      <TwoFactorForm />
    </>
  );
}
