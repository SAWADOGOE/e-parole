"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "../lib/auth-client";
import { authErrorKey } from "../lib/error-codes";
import { safeReturnTo } from "../lib/return-to";
import { firstErrors, signInSchema, type FieldErrorKeys } from "../schemas";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<FieldErrorKeys>({});
  const [formError, setFormError] = useState<string | null>(
    params.get("raison") === "session-admin-expiree" ? t("adminSessionExpired") : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { data, error } = await authClient.signIn.email({ email: parsed.data.email, password: parsed.data.password });
    setPending(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    if ("twoFactorRedirect" in data) {
      router.push("/connexion/deux-facteurs");
      return;
    }
    router.push(safeReturnTo(params.get("retour")));
    router.refresh();
  }

  return (
    <form method="post" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField
        name="email"
        type="email"
        label={t("emailLabel")}
        autoComplete="email"
        inputMode="email"
        required
        error={errors["email"] ? t(errors["email"]) : undefined}
      />
      <FormField
        name="password"
        type="password"
        label={t("passwordLabel")}
        autoComplete="current-password"
        required
        error={errors["password"] ? t(errors["password"]) : undefined}
        trailing={
          <Link href="/mot-de-passe-oublie" className="text-sm text-accent underline-offset-4 hover:underline">
            {t("forgotPassword")}
          </Link>
        }
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("pending") : t("submitSignIn")}
      </Button>
      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/inscription" className="font-medium text-accent underline-offset-4 hover:underline">
          {t("submitSignUp")}
        </Link>
      </p>
    </form>
  );
}
