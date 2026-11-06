"use client";

import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { notify } from "@/lib/notify";
import { PREFERENCE_TYPES } from "../constants";
import { savePreferencesAction } from "../server/actions";
import type { NotificationPreferences } from "../types";

/** Préférences par type (REQ-NOTIF-2, in-app). Les décisions de modération restent toujours communiquées. */
export function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors.codes");
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await savePreferencesAction(prefs);
      if (result.ok) notify(t("preferencesSaved"));
      else setError(tErrors(errorKey(result.error.code)));
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <fieldset className="flex flex-col divide-y border-y">
        <legend className="sr-only">{t("preferencesTitle")}</legend>
        {PREFERENCE_TYPES.map((type) => (
          <label key={type} className="flex min-h-12 items-center justify-between gap-4 py-2 text-base text-fg">
            {t(`pref.${type}`)}
            <input type="checkbox" checked={prefs[type]} onChange={(event) => setPrefs({ ...prefs, [type]: event.target.checked })} className="size-5 accent-(--accent)" />
          </label>
        ))}
      </fieldset>
      <FormAlert message={error} />
      <div>
        <Button type="submit" disabled={busy}>
          {t("preferencesSave")}
        </Button>
      </div>
    </form>
  );
}
