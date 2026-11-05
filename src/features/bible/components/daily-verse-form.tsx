"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { errorKey } from "@/lib/error-key";
import type { AppErrorPayload } from "@/server/errors/app-error";
import { REFLECTION_MAX_LENGTH } from "../constants";
import { previewDailyVerseAction, scheduleDailyVerseAction } from "../server/admin-actions";
import type { Passage } from "../types";
import { VerseQuote } from "./verse-quote";

/** Programmation : aperçu exact, puis confirmation explicite si le passage revient à moins de 30 jours. */
export function DailyVerseForm({ defaultDate }: { defaultDate: string }) {
  const t = useTranslations("adminBible");
  const tErrors = useTranslations("errors.codes");
  const format = useFormatter();
  const router = useRouter();
  const reflectionId = useId();
  const [date, setDate] = useState(defaultDate);
  const [reference, setReference] = useState("");
  const [reflection, setReflection] = useState("");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dayLabel = (value: string): string => format.dateTime(new Date(`${value}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  function explain(payload: AppErrorPayload): string {
    const fields = payload.fieldErrors;
    if (fields?.["date"]) return t("dateOutOfWindow");
    if (fields?.["reference"]?.includes("invalidReference")) return t("invalidReference");
    return tErrors(errorKey(payload.code));
  }

  async function preview(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await previewDailyVerseAction({ date, reference }).finally(() => setBusy(false));
    if (!result.ok) {
      setPassage(null);
      setError(explain(result.error));
      return;
    }
    setPassage(result.data?.passage ?? null);
    setDuplicates(result.data?.duplicates ?? []);
    if (!result.data) setError(t("invalidReference"));
  }

  async function schedule(acknowledgeDuplicate: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await scheduleDailyVerseAction({ date, reference, reflection, acknowledgeDuplicate }).finally(() => setBusy(false));
    if (result.ok) {
      toast(t("scheduledDone", { date: dayLabel(date) }));
      setReference("");
      setReflection("");
      setPassage(null);
      setDuplicates([]);
      router.refresh();
      return;
    }
    if (result.error.code === "CONFLICT" && result.error.fieldErrors?.["reference"]) {
      setDuplicates(result.error.fieldErrors["reference"]);
      return;
    }
    setError(explain(result.error));
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void schedule(false);
  }

  return (
    <section aria-labelledby="programmer">
      <h2 id="programmer" className="text-xl font-semibold text-fg">
        {t("formTitle")}
      </h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-4">
        <FormAlert message={error} />
        <FormField label={t("dateLabel")} name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        <FormField label={t("referenceLabel")} hint={t("referenceHint")} name="reference" required maxLength={80} value={reference} onChange={(event) => setReference(event.target.value)} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={reflectionId}>{t("reflectionLabel")}</Label>
          <textarea
            id={reflectionId}
            rows={2}
            maxLength={REFLECTION_MAX_LENGTH}
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            aria-describedby={`${reflectionId}-hint`}
            className="w-full rounded-sm border border-border-strong bg-bg-elevated p-3 text-base text-fg"
          />
          <p id={`${reflectionId}-hint`} className="text-sm text-muted">
            {t("reflectionHint")}
          </p>
        </div>

        {passage ? (
          <div aria-live="polite" className="rounded-md border p-4">
            <p className="mb-2 text-sm font-semibold text-fg">{t("previewTitle")}</p>
            <VerseQuote passage={passage} />
            {reflection.trim() ? <p className="mt-3 text-sm text-muted">{reflection}</p> : null}
          </div>
        ) : null}

        {duplicates.length > 0 ? (
          <p role="status" className="rounded-md border border-warning p-3 text-sm text-fg">
            {t("duplicateWarning", { dates: duplicates.map(dayLabel).join(", ") })}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy || !reference.trim()} onClick={() => void preview()}>
            {t("preview")}
          </Button>
          {duplicates.length > 0 ? (
            <Button type="button" disabled={busy} onClick={() => void schedule(true)}>
              {t("duplicateConfirm")}
            </Button>
          ) : (
            <Button type="submit" disabled={busy || !reference.trim()}>
              {t("schedule")}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
