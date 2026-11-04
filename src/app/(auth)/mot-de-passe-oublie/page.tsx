import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/shared/page-heading";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <PageHeading title={t("forgotTitle")} intro={t("forgotIntro")} />
      <ForgotPasswordForm />
    </>
  );
}
