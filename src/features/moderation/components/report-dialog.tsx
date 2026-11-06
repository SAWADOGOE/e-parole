"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { formText } from "@/lib/form-data";
import { notify } from "@/lib/notify";
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReasonName, type ReportTargetName } from "../constants";
import { reportAction } from "../server/actions";

interface ReportDialogProps {
  targetType: ReportTargetName;
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TITLE: Record<ReportTargetName, "titlePost" | "titleComment" | "titleProfile"> = { POST: "titlePost", COMMENT: "titleComment", PROFILE: "titleProfile" };

/** Signalement (US-41, côté membre) : motif obligatoire, précisions facultatives ≤ 1 000 caractères. Chargé à la demande. */
export default function ReportDialog({ targetType, targetId, open, onOpenChange }: ReportDialogProps) {
  const t = useTranslations("report");
  const tErrors = useTranslations("errors.codes");
  const id = useId();
  const [reason, setReason] = useState<ReportReasonName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reportAction({ targetType, targetId, reason, details: formText(new FormData(event.currentTarget), "details") });
      if (result.ok) {
        notify(t("sent"));
        onOpenChange(false);
      } else setError(result.error.code === "CONFLICT" ? t("already") : tErrors(errorKey(result.error.code)));
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogTitle>{t(TITLE[targetType])}</AlertDialogTitle>
        <AlertDialogDescription>{t("intro")}</AlertDialogDescription>
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-2 text-sm font-medium text-fg">{t("reasonLabel")}</legend>
            {REPORT_REASONS.map((value) => (
              <label key={value} className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm hover:bg-bg-subtle">
                <input type="radio" name="reason" value={value} required checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-(--accent)" />
                {t(`reasons.${value}`)}
              </label>
            ))}
          </fieldset>
          {reason === "SELF_HARM" || reason === "MINOR_SAFETY" ? <p className="rounded-md border border-warning px-3 py-2 text-sm text-fg">{t("distress")}</p> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-details`} className="text-sm font-medium text-fg">
              {t("detailsLabel")}
            </label>
            <textarea
              id={`${id}-details`}
              name="details"
              maxLength={REPORT_DETAILS_MAX}
              rows={3}
              aria-describedby={`${id}-help`}
              className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <p id={`${id}-help`} className="text-sm text-muted">
              {t("detailsHelp")}
            </p>
          </div>
          <FormAlert message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("cancel")}</AlertDialogCancel>
            <Button type="submit" disabled={busy || !reason}>
              {t("submit")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
