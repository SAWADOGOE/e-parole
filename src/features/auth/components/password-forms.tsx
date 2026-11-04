"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "../lib/auth-client";
import { authErrorKey } from "../lib/error-codes";
import { emailSchema, PASSWORD_MIN, resetSchema } from "../schemas";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [status, setStatus] = useState<"idle" | "pending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(t("invalidEmail"));
      return;
    }
    setStatus("pending");
    const result = await authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: "/reinitialiser" });
    if (result.error?.status === 429) {
      setStatus("idle");
      setError(t("rateLimited"));
      return;
    }
    // Message identique que le compte existe ou non (pas d'énumération).
    setStatus("sent");
  }

  if (status === "sent") return <FormAlert tone="success" message={t("forgotSent")} />;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      <FormAlert message={error} />
      <FormField name="email" type="email" label={t("emailLabel")} autoComplete="email" inputMode="email" required />
      <Button type="submit" size="lg" disabled={status === "pending"}>
        {status === "pending" ? t("pending") : t("forgotSubmit")}
      </Button>
      <Link href="/connexion" className="text-center text-sm text-accent underline-offset-4 hover:underline">
        {t("backToSignIn")}
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations("auth");
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(token ? null : t("resetInvalid"));

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    const parsed = resetSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(t("passwordTooShort", { min: PASSWORD_MIN }));
      return;
    }
    setStatus("pending");
    const result = await authClient.resetPassword({ newPassword: parsed.data.password, token });
    if (result.error) {
      setStatus("idle");
      setError(t(authErrorKey(result.error), { min: PASSWORD_MIN }));
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success" message={t("resetDone")} />
        <Button asChild size="lg">
          <Link href="/connexion">{t("submitSignIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      <FormAlert message={error} />
      <FormField
        name="password"
        type="password"
        label={t("newPasswordLabel")}
        hint={t("passwordHint", { min: PASSWORD_MIN })}
        autoComplete="new-password"
        required
        disabled={!token}
      />
      <Button type="submit" size="lg" disabled={!token || status === "pending"}>
        {status === "pending" ? t("pending") : t("resetSubmit")}
      </Button>
    </form>
  );
}
