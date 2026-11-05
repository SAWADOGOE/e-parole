import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/shared/form-field";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyTitle") };
}

export default async function VerificationPage(props: PageProps<"/verification">) {
  const t = await getTranslations("auth");
  const params = await props.searchParams;
  const failed = params["error"] !== undefined;
  const status = params["statut"];
  const message = failed ? t("verifyFailed") : status === "ok" ? t("verifySuccess") : t("verifyPending");
  return (
    <>
      <PageHeading title={t("verifyTitle")} />
      <div className="flex flex-col gap-6">
        <FormAlert tone={failed ? "danger" : "success"} message={message} />
        <Button asChild size="lg" variant={failed ? "secondary" : "primary"}>
          <Link href={failed ? "/connexion" : "/"}>{failed ? t("backToSignIn") : t("goHome")}</Link>
        </Button>
      </div>
    </>
  );
}
