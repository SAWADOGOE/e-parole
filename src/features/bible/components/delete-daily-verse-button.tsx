"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { errorKey } from "@/lib/error-key";
import { notify, notifyError } from "@/lib/notify";
import { focusFallback, restoreFocus } from "../lib/focus";
import { deleteDailyVerseAction } from "../server/admin-actions";

export function DeleteDailyVerseButton({ date, label, reference }: { date: string; label: string; reference: string }) {
  const t = useTranslations("adminBible");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const opener = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  async function remove(): Promise<void> {
    const result = await deleteDailyVerseAction({ date });
    if (!result.ok) {
      notifyError(tErrors(errorKey(result.error.code)));
      return;
    }
    notify(t("removed"));
    focusFallback();
    router.refresh();
  }

  return (
    <>
      <button ref={opener} type="button" aria-label={label} onClick={() => setConfirming(true)} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus(opener.current);
          }}
        >
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{t("removeConfirmBody", { reference })}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction danger onClick={() => void remove()}>
              {tCommon("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
