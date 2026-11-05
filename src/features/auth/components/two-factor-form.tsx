"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "../lib/auth-client";
import { authErrorKey } from "../lib/error-codes";
import { safeReturnTo } from "../lib/return-to";
import { backupCodeSchema, totpSchema } from "../schemas";

export function TwoFactorForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const schema = mode === "totp" ? totpSchema : backupCodeSchema;
    const parsed = schema.safeParse({ code: form.get("code") });
    if (!parsed.success) {
      setFormError(t("invalidCode"));
      return;
    }
    setPending(true);
    const { error } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: parsed.data.code })
        : await authClient.twoFactor.verifyBackupCode({ code: parsed.data.code });
    setPending(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    router.push(safeReturnTo(params.get("retour")));
    router.refresh();
  }

  return (
    <form method="post" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField
        key={mode}
        name="code"
        label={mode === "totp" ? t("totpLabel") : t("backupCodeLabel")}
        inputMode={mode === "totp" ? "numeric" : "text"}
        autoComplete="one-time-code"
        maxLength={mode === "totp" ? 6 : 32}
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("pending") : t("submitVerify")}
      </Button>
      <Button variant="link" onClick={() => setMode(mode === "totp" ? "backup" : "totp")}>
        {mode === "totp" ? t("useBackupCode") : t("useTotp")}
      </Button>
    </form>
  );
}
