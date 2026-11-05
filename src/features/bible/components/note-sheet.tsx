"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { errorKey } from "@/lib/error-key";
import type { Result } from "@/server/errors/result";
import { NOTE_MAX_LENGTH } from "../constants";
import { ReaderSheet } from "./reader-sheet";

interface NoteSheetProps {
  reference: string;
  initialBody?: string;
  onClose: () => void;
  onSubmit: (body: string) => Promise<Result<unknown>>;
  onSaved: () => void;
}

export default function NoteSheet({ reference, initialBody = "", onClose, onSubmit, onSaved }: NoteSheetProps) {
  const t = useTranslations("bible.notes");
  const tErrors = useTranslations("errors.codes");
  const id = useId();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await onSubmit(body).finally(() => setBusy(false));
    if (!result.ok) {
      setError(tErrors(errorKey(result.error.code)));
      return;
    }
    toast(t("saved"));
    onClose();
    onSaved();
  }

  return (
    <ReaderSheet title={t("dialogTitle", { reference })} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t("privacy")}</p>
        <FormAlert message={error} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{t("bodyLabel")}</Label>
          <textarea
            id={id}
            required
            rows={6}
            maxLength={NOTE_MAX_LENGTH}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-describedby={`${id}-count`}
            className="w-full rounded-sm border border-border-strong bg-bg-elevated p-3 text-base text-fg"
          />
          <p id={`${id}-count`} className="text-sm text-muted">
            {t("remaining", { count: NOTE_MAX_LENGTH - body.length })}
          </p>
        </div>
        <Button type="submit" disabled={busy || body.trim().length === 0}>
          {t("save")}
        </Button>
      </form>
    </ReaderSheet>
  );
}
