"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { formText } from "@/lib/form-data";
import { notify } from "@/lib/notify";
import { BIO_MAX, DISPLAY_NAME_MAX, FIELD_VISIBILITIES, type FieldVisibility } from "../constants";
import { editProfileAction } from "../server/actions";
import type { OwnProfile } from "../types";

type FieldKey = "churchName" | "city" | "country" | "denomination";
const VISIBILITY_OF: Record<FieldKey, "churchVisibility" | "locationVisibility" | "countryVisibility" | "denominationVisibility"> = {
  churchName: "churchVisibility",
  city: "locationVisibility",
  country: "countryVisibility",
  denomination: "denominationVisibility",
};
const LABEL: Record<FieldKey, "churchLabel" | "cityLabel" | "countryLabel" | "denominationLabel"> = {
  churchName: "churchLabel",
  city: "cityLabel",
  country: "countryLabel",
  denomination: "denominationLabel",
};
const MAX: Record<FieldKey, number> = { churchName: 100, city: 80, country: 60, denomination: 80 };

function visibility(form: FormData, name: string): FieldVisibility {
  const value = formText(form, name);
  return FIELD_VISIBILITIES.find((v) => v === value) ?? "PRIVATE";
}

/** REQ-PROF-1, 2 : champs sensibles facultatifs, visibilité par champ, privés par défaut. */
export function ProfileForm({ profile }: { profile: OwnProfile }) {
  const t = useTranslations("profile");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setErrors({});
    setAlert(null);
    try {
      const result = await editProfileAction({
        displayName: formText(form, "displayName"),
        handle: formText(form, "handle"),
        bio: formText(form, "bio"),
        churchName: formText(form, "churchName"),
        churchVisibility: visibility(form, "churchVisibility"),
        city: formText(form, "city"),
        locationVisibility: visibility(form, "locationVisibility"),
        country: formText(form, "country"),
        countryVisibility: visibility(form, "countryVisibility"),
        denomination: formText(form, "denomination"),
        denominationVisibility: visibility(form, "denominationVisibility"),
        isDiscoverable: form.get("isDiscoverable") === "on",
      });
      if (!result.ok) {
        const handleError = result.error.fieldErrors?.["handle"]?.[0];
        if (handleError) {
          const message = t(`errors.${handleError === "handleTaken" || handleError === "handleReserved" || handleError === "handleCooldown" ? handleError : "handleFormat"}`);
          setErrors({ handle: message });
          // Annoncée (région d'alerte) et reliée au champ, qui reçoit le focus.
          setAlert(message);
          document.querySelector<HTMLInputElement>('input[name="handle"]')?.focus();
        }
        else setAlert(tErrors(errorKey(result.error.code)));
        return;
      }
      notify(t("saved"));
      router.refresh();
    } catch {
      setAlert(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <FormField name="displayName" label={t("displayNameLabel")} defaultValue={profile.displayName} maxLength={DISPLAY_NAME_MAX} required autoComplete="nickname" />
      <FormField name="handle" label={t("handleLabel")} defaultValue={profile.handle} hint={t("handleHelp")} error={errors["handle"]} maxLength={30} required autoCapitalize="none" spellCheck={false} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profil-bio" className="text-sm font-medium text-fg">
          {t("bioLabel")}
        </label>
        <textarea id="profil-bio" name="bio" defaultValue={profile.bio} maxLength={BIO_MAX} rows={3} aria-describedby="profil-bio-aide" className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        <p id="profil-bio-aide" className="text-sm text-muted">
          {t("bioHelp")}
        </p>
      </div>

      <fieldset className="flex flex-col gap-4 border-t pt-5">
        <legend className="text-lg font-semibold text-fg">{t("sensitiveTitle")}</legend>
        <p className="text-sm text-muted">{t("sensitiveIntro")}</p>
        {(Object.keys(VISIBILITY_OF) as FieldKey[]).map((key) => {
          const locked = profile.isMinor && (key === "city" || key === "country");
          const visibilityName = VISIBILITY_OF[key];
          return (
            <div key={key} className="grid gap-2 sm:grid-cols-[1fr_12rem] sm:items-end">
              <FormField name={key} label={t(LABEL[key])} defaultValue={profile[key]} maxLength={MAX[key]} {...(locked ? { hint: t("minorLocation") } : {})} />
              {locked ? (
                <input type="hidden" name={visibilityName} value="PRIVATE" />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`visibilite-${key}`} className="text-sm text-muted">
                    {t("visibilityLabel", { field: t(LABEL[key]) })}
                  </label>
                  <select id={`visibilite-${key}`} name={visibilityName} defaultValue={profile[visibilityName]} className="h-11 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base text-fg">
                    {FIELD_VISIBILITIES.map((value) => (
                      <option key={value} value={value}>
                        {t(`visibility.${value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <div className="flex items-start gap-3 border-t pt-5">
        <input id="profil-decouvrable" type="checkbox" name="isDiscoverable" defaultChecked={profile.isDiscoverable} aria-describedby="profil-decouvrable-aide" className="mt-1 size-5 accent-(--accent)" />
        <div>
          <label htmlFor="profil-decouvrable" className="font-medium text-fg">
            {t("discoverableLabel")}
          </label>
          <p id="profil-decouvrable-aide" className="text-sm text-muted">
            {t("discoverableHelp")}
          </p>
        </div>
      </div>
      <FormAlert message={alert} />
      <div>
        <Button type="submit" disabled={busy}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
