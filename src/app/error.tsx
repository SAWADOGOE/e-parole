"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4">
      <EmptyState
        icon={CloudOff}
        title={t("errors.genericTitle")}
        body={t("errors.genericBody")}
        actions={<Button onClick={reset}>{t("common.retry")}</Button>}
      />
      {error.digest ? (
        <p className="text-xs text-muted">{t("common.requestId", { id: error.digest })}</p>
      ) : null}
    </main>
  );
}
