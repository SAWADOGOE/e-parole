import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/shared/page-heading";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle") };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <PageHeading title={t("signUpTitle")} intro={t("signUpIntro")} />
      <SignUpForm />
    </>
  );
}
