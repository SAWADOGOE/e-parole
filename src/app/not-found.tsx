import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4">
      <Wordmark className="mb-8" />
      <EmptyState
        icon={Compass}
        title={t("errors.notFoundTitle")}
        body={t("errors.notFoundBody")}
        actions={
          <Button asChild>
            <Link href="/">{t("auth.goHome")}</Link>
          </Button>
        }
      />
    </main>
  );
}
