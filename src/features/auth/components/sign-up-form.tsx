"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "../lib/auth-client";
import { authErrorKey } from "../lib/error-codes";
import { firstErrors, PASSWORD_MIN, signUpSchema, type FieldErrorKeys } from "../schemas";

export function SignUpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrorKeys>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      birthYear: parsed.data.birthYear,
      callbackURL: "/verification?statut=ok",
    });
    setPending(false);
    if (error) {
      setFormError(t(authErrorKey(error), { min: PASSWORD_MIN }));
      return;
    }
    router.push("/verification?statut=envoye");
    router.refresh();
  }

  const err = (field: string) => (errors[field] ? t(errors[field], { min: PASSWORD_MIN }) : undefined);

  return (
    <form method="post" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField name="name" label={t("nameLabel")} hint={t("nameHint")} autoComplete="name" required error={err("name")} />
      <FormField name="email" type="email" label={t("emailLabel")} autoComplete="email" inputMode="email" required error={err("email")} />
      <FormField
        name="password"
        type="password"
        label={t("passwordLabel")}
        hint={t("passwordHint", { min: PASSWORD_MIN })}
        autoComplete="new-password"
        required
        error={err("password")}
      />
      <FormField
        name="birthYear"
        label={t("birthYearLabel")}
        hint={t("birthYearHint")}
        inputMode="numeric"
        autoComplete="bday-year"
        maxLength={4}
        required
        error={err("birthYear")}
      />
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-sm text-fg">
          <input
            name="consent"
            type="checkbox"
            required
            aria-invalid={errors["consent"] ? true : undefined}
            aria-describedby={errors["consent"] ? "consent-error" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-(--accent)"
          />
          <span>{t("consentLabel")}</span>
        </label>
        {errors["consent"] ? (
          <p id="consent-error" className="text-sm text-danger">
            {t(errors["consent"])}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("pending") : t("submitSignUp")}
      </Button>
      <p className="text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/connexion" className="font-medium text-accent underline-offset-4 hover:underline">
          {t("submitSignIn")}
        </Link>
      </p>
    </form>
  );
}
