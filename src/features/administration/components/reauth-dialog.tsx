"use client";

import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormField } from "@/components/shared/form-field";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { formText } from "@/lib/form-data";
import { reauthenticateAction } from "../server/actions";

/** Ré-authentification par mot de passe (10 min) avant une action sensible ; l'erreur s'affiche dans la modale. */
export function ReauthDialog({ open, onClose, onConfirmed }: { open: boolean; onClose: () => void; onConfirmed: () => void }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors.codes");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    setError(undefined);
    try {
      const result = await reauthenticateAction({ password: formText(new FormData(event.currentTarget), "password") });
      if (!result.ok) {
        setError(result.error.fieldErrors?.["password"] ? tAuth("wrongPassword") : tErrors(errorKey(result.error.code)));
        return;
      }
      onConfirmed();
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogTitle>{t("reauthTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{t("reauthIntro")}</AlertDialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <FormField name="password" type="password" label={tAuth("passwordLabel")} autoComplete="current-password" required error={error} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{tCommon("cancel")}</AlertDialogCancel>
            <Button type="submit" disabled={busy}>
              {t("reauthSubmit")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
