"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { errorKey } from "@/lib/error-key";
import { notify } from "@/lib/notify";
import type { AppErrorPayload } from "@/server/errors/app-error";
import { REFLECTION_MAX_LENGTH } from "../constants";
import { previewDailyVerseAction, scheduleDailyVerseAction } from "../server/admin-actions";
import type { Passage } from "../types";
import { VerseQuote } from "./verse-quote";

interface FieldErrors {
  date?: string;
  reference?: string;
}

/** Programmation : aperçu exact, puis confirmation explicite si le passage revient à moins de 30 jours. */
export function DailyVerseForm({ defaultDate }: { defaultDate: string }) {
  const t = useTranslations("adminBible");
  const tErrors = useTranslations("errors.codes");
  const format = useFormatter();
  const router = useRouter();
  const reflectionId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState(defaultDate);
  const [reference, setReference] = useState("");
  const [reflection, setReflection] = useState("");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dayLabel = (value: string): string => format.dateTime(new Date(`${value}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  /** Un aperçu ou un avertissement ne vaut que pour la saisie contrôlée : il ne survit pas à un changement. */
  function resetChecks(): void {
    setPassage(null);
    setDuplicates([]);
    setFieldErrors({});
    setError(null);
  }

  function explain(payload: AppErrorPayload): void {
    const fields = payload.fieldErrors;
    if (fields?.["date"]) setFieldErrors({ date: t("dateOutOfWindow") });
    else if (fields?.["reference"]?.includes("invalidReference")) setFieldErrors({ reference: t("invalidReference") });
    else setError(tErrors(errorKey(payload.code)));
  }

  async function preview(): Promise<void> {
    setBusy(true);
    resetChecks();
    const result = await previewDailyVerseAction({ date, reference }).finally(() => setBusy(false));
    if (!result.ok) {
      explain(result.error);
      return;
    }
    if (!result.data) {
      setFieldErrors({ reference: t("invalidReference") });
      return;
    }
    setPassage(result.data.passage);
    setDuplicates(result.data.duplicates);
  }

  async function schedule(): Promise<void> {
    const acknowledgeDuplicate = duplicates.length > 0;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const result = await scheduleDailyVerseAction({ date, reference, reflection, acknowledgeDuplicate }).finally(() => setBusy(false));
    if (result.ok) {
      notify(t("scheduledDone", { date: dayLabel(date) }));
      setReference("");
      setReflection("");
      resetChecks();
      router.refresh();
      form.current?.querySelector<HTMLElement>('[name="reference"]')?.focus();
      return;
    }
    if (result.error.code === "CONFLICT" && result.error.fieldErrors?.["reference"]) {
      setDuplicates(result.error.fieldErrors["reference"]);
      return;
    }
    explain(result.error);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void schedule();
  }

  return (
    <section aria-labelledby="programmer">
      <h2 id="programmer" className="text-xl font-semibold text-fg">
        {t("formTitle")}
      </h2>
      <form ref={form} onSubmit={submit} className="mt-3 flex flex-col gap-4">
        <FormAlert message={error} />
        <FormField
          label={t("dateLabel")}
          name="date"
          type="date"
          required
          value={date}
          error={fieldErrors.date}
          onChange={(event) => {
            setDate(event.target.value);
            resetChecks();
          }}
        />
        <FormField
          label={t("referenceLabel")}
          hint={t("referenceHint")}
          name="reference"
          required
          maxLength={80}
          value={reference}
          error={fieldErrors.reference}
          onChange={(event) => {
            setReference(event.target.value);
            resetChecks();
          }}
        />
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

        {/* Régions stables : seul leur contenu change, pour une annonce fiable. */}
        <div aria-live="polite">
          {passage ? (
            <div className="rounded-md border p-4">
              <p className="mb-2 text-sm font-semibold text-fg">{t("previewTitle")}</p>
              <VerseQuote passage={passage} />
              {reflection.trim() ? <p className="mt-3 text-sm text-muted">{reflection}</p> : null}
            </div>
          ) : null}
        </div>
        <div role="status">
          {duplicates.length > 0 ? <p className="rounded-md border border-warning p-3 text-sm text-fg">{t("duplicateWarning", { dates: duplicates.map(dayLabel).join(", ") })}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void preview()}>
            {t("preview")}
          </Button>
          {/* Un seul bouton dont le libellé change : le remplacer ferait perdre le focus. */}
          <Button type="submit" disabled={busy}>
            {duplicates.length > 0 ? t("duplicateConfirm") : t("schedule")}
          </Button>
        </div>
      </form>
    </section>
  );
}
