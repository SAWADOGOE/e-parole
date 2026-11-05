"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { formText } from "@/lib/form-data";
import { activateVersionAction, reauthenticateForBibleAction, setPublishedAction } from "../server/admin-actions";

type TranslationControlProps =
  | { kind: "activate"; versionId: number }
  | { kind: "publish"; translationId: number; published: boolean; name: string };

/** Activation et publication : confirmation, puis ré-authentification si le serveur l'exige (SUPER_ADMIN, audité). */
export function TranslationControl(props: TranslationControlProps) {
  const t = useTranslations("adminBible");
  const tAdmin = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [reauthError, setReauthError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const isActivate = props.kind === "activate";
  const unpublishing = props.kind === "publish" && props.published;
  const label = isActivate ? t("activate") : t(unpublishing ? "unpublish" : "publish");
  const title = isActivate
    ? t("activateConfirmTitle", { id: props.versionId })
    : t(unpublishing ? "unpublishConfirmTitle" : "publishConfirmTitle", { name: props.name });
  const body = isActivate ? t("activateConfirmBody") : t(unpublishing ? "unpublishConfirmBody" : "publishConfirmBody");

  async function apply(): Promise<void> {
    setBusy(true);
    const call =
      props.kind === "activate"
        ? activateVersionAction({ versionId: props.versionId })
        : setPublishedAction({ translationId: props.translationId, published: !props.published });
    const result = await call.finally(() => setBusy(false));
    if (result.ok) {
      toast(t("done"));
      router.refresh();
    } else if (result.error.code === "REAUTH_REQUIRED") {
      setReauth(true);
    } else {
      toast(tErrors(errorKey(result.error.code)));
    }
  }

  async function submitReauth(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const password = formText(new FormData(event.currentTarget), "password");
    setBusy(true);
    setReauthError(undefined);
    const result = await reauthenticateForBibleAction({ password }).finally(() => setBusy(false));
    if (!result.ok) {
      setReauthError(result.error.fieldErrors?.["password"] ? tAuth("wrongPassword") : tErrors(errorKey(result.error.code)));
      return;
    }
    setReauth(false);
    await apply();
  }

  return (
    <>
      <Button size="sm" variant={isActivate ? "primary" : "secondary"} disabled={busy} onClick={() => setConfirming(true)}>
        {label}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction danger={unpublishing} onClick={() => void apply()}>
              {tCommon("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reauth} onOpenChange={setReauth}>
        <AlertDialogContent>
          <AlertDialogTitle>{tAdmin("reauthTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{tAdmin("reauthIntro")}</AlertDialogDescription>
          <form method="post" onSubmit={(event) => void submitReauth(event)} className="flex flex-col gap-4">
            <FormField name="password" type="password" label={tAuth("passwordLabel")} autoComplete="current-password" required error={reauthError} />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">{tCommon("cancel")}</AlertDialogCancel>
              <Button type="submit" disabled={busy}>
                {tAdmin("reauthSubmit")}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
