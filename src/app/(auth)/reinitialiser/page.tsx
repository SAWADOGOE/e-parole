import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/shared/page-heading";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default async function ResetPasswordPage(props: PageProps<"/reinitialiser">) {
  const t = await getTranslations("auth");
  const params = await props.searchParams;
  const token = typeof params["token"] === "string" ? params["token"] : null;
  const invalid = params["error"] !== undefined;
  return (
    <>
      <PageHeading title={t("resetTitle")} />
      <ResetPasswordForm token={invalid ? null : token} />
    </>
  );
}
