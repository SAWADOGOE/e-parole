"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { ReauthDialog } from "@/features/administration/components/reauth-dialog";
import { errorKey } from "@/lib/error-key";
import { formText } from "@/lib/form-data";
import { notify } from "@/lib/notify";
import { DECISIONS, INTERNAL_NOTE_MAX, PUBLIC_REASON_MAX, type DecisionName } from "../constants";
import { decideAction } from "../server/actions";

interface DecisionFormProps {
  caseId: string;
  targetIsProfile: boolean;
  targetHandle: string | null;
  /** Indications d'interface ; le serveur revérifie chaque permission et le plafond de 30 jours. */
  canBan: boolean;
  maxSuspensionDays: number;
}

type Payload = { caseId: string; decision: DecisionName; publicReason: string; internalNote: string; durationDays: number | null; confirmHandle: string };

/** Décision d'un dossier (US-41). Suspendre et bannir : ré-authentification et ressaisie du @handle visé. */
export function DecisionForm({ caseId, targetIsProfile, targetHandle, canBan, maxSuspensionDays }: DecisionFormProps) {
  const t = useTranslations("admin");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [decision, setDecision] = useState<DecisionName>("DISMISS");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Payload | null>(null);
  const heavy = decision === "SUSPEND" || decision === "BAN";

  // Raccourci Ctrl/⌘ + Entrée (docs/admin/ADMIN-MODERATION.md), écouté sur le formulaire entier.
  useEffect(() => {
    const element = form.current;
    if (!element) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        element.requestSubmit();
      }
    };
    element.addEventListener("keydown", onKey);
    return () => element.removeEventListener("keydown", onKey);
  }, []);

  async function apply(payload: Payload): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await decideAction(payload);
      if (result.ok) {
        notify(t("decisionApplied"));
        router.refresh();
        // Le formulaire disparaît une fois le dossier traité : le focus va au titre du dossier.
        document.getElementById("titre-dossier")?.focus();
      } else if (result.error.code === "REAUTH_REQUIRED") setPending(payload);
      else if (result.error.fieldErrors?.["confirmHandle"]) setError(t("handleMismatch"));
      else setError(result.error.code === "CONFLICT" ? t("caseClosed") : tErrors(errorKey(result.error.code)));
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    void apply({
      caseId,
      decision,
      publicReason: formText(data, "publicReason"),
      internalNote: formText(data, "internalNote"),
      durationDays: decision === "SUSPEND" ? Number(formText(data, "durationDays")) : null,
      confirmHandle: heavy ? formText(data, "confirmHandle") : "",
    });
  }

  const available = DECISIONS.filter((value) => (value !== "BAN" || canBan) && !(targetIsProfile && (value === "HIDE" || value === "REMOVE")));

  return (
    <form
      ref={form}
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-base font-semibold text-fg">{t("decisionTitle")}</legend>
        {available.map((value) => (
          <div key={value} className="flex min-h-11 items-start gap-3 rounded-md px-2 py-2">
            <input id={`${id}-${value}`} type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} aria-describedby={`${id}-${value}-aide`} className="mt-1 size-4 accent-(--accent)" />
            <span>
              <label htmlFor={`${id}-${value}`} className="block text-sm font-medium text-fg">
                {t(`decision.${value}`)}
              </label>
              <span id={`${id}-${value}-aide`} className="block text-xs text-muted">{t(`decisionHelp.${value}`)}</span>
            </span>
          </div>
        ))}
      </fieldset>
      {decision === "SUSPEND" ? (
        <label className="flex flex-col gap-1 text-sm text-fg">
          {t("durationLabel")}
          <input name="durationDays" type="number" min={1} max={maxSuspensionDays} defaultValue={7} required aria-describedby={`${id}-duration`} className="h-11 w-32 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base" />
          <span id={`${id}-duration`} className="text-xs text-muted">{t("durationHelp")}</span>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm text-fg">
        {t("publicReasonLabel")}
        <textarea name="publicReason" required maxLength={PUBLIC_REASON_MAX} rows={3} aria-describedby={`${id}-reason`} className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-base" />
        <span id={`${id}-reason`} className="text-xs text-muted">{t("publicReasonHelp")}</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg">
        {t("internalNoteLabel")}
        <textarea name="internalNote" maxLength={INTERNAL_NOTE_MAX} rows={2} className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-base" />
      </label>
      {heavy && targetHandle ? (
        <label className="flex flex-col gap-1 text-sm text-fg">
          {t("confirmHandleLabel", { handle: targetHandle })}
          <input
            name="confirmHandle"
            required
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error === t("handleMismatch") || undefined}
            aria-describedby={error === t("handleMismatch") ? `${id}-erreur` : undefined}
            className="h-11 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base" />
        </label>
      ) : null}
      <FormAlert id={`${id}-erreur`} message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={heavy || decision === "REMOVE" ? "danger" : "primary"} aria-disabled={busy || undefined} aria-keyshortcuts="Control+Enter" aria-describedby={`${id}-raccourci`}>
          {t("applyDecision")}
        </Button>
        <span id={`${id}-raccourci`} className="text-xs text-muted">
          {t("applyShortcut")}
        </span>
      </div>
      <ReauthDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirmed={() => {
          const payload = pending;
          setPending(null);
          if (payload) void apply(payload);
        }}
      />
    </form>
  );
}
