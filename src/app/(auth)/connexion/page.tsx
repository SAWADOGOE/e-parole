import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeading } from "@/components/shared/page-heading";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle") };
}

export default async function SignInPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <PageHeading title={t("signInTitle")} intro={t("signInIntro")} />
      <Suspense>
        <SignInForm />
      </Suspense>
    </>
  );
}
