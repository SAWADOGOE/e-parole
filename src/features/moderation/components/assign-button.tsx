"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { notify, notifyError } from "@/lib/notify";
import { assignCaseAction } from "../server/actions";

export function AssignButton({ caseId }: { caseId: string }) {
  const t = useTranslations("admin");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function assign(): Promise<void> {
    setBusy(true);
    try {
      const result = await assignCaseAction({ caseId });
      if (result.ok) {
        notify(t("assigned"));
        router.refresh();
      } else notifyError(tErrors(errorKey(result.error.code)));
    } catch {
      notifyError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void assign()}>
      {t("assignToMe")}
    </Button>
  );
}
