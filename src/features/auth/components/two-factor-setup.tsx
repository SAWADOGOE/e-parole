"use client";

import { formText } from "@/lib/form-data";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { FormAlert, FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "../lib/auth-client";
import { authErrorKey } from "../lib/error-codes";
import { totpSchema } from "../schemas";

type Step =
  | { kind: "idle" }
  | { kind: "password"; mode: "enable" | "disable" }
  | { kind: "scan"; qr: string; secret: string; backupCodes: string[] }
  | { kind: "backup"; backupCodes: string[] };

function secretFromUri(uri: string): string {
  return new URL(uri).searchParams.get("secret") ?? "";
}

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const t = useTranslations("security");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitPassword(event: SubmitEvent<HTMLFormElement>, mode: "enable" | "disable") {
    event.preventDefault();
    setError(null);
    const password = formText(new FormData(event.currentTarget), "password");
    setPending(true);
    if (mode === "enable") {
      const { data, error: apiError } = await authClient.twoFactor.enable({ password, method: "totp" });
      setPending(false);
      if (apiError || data.method !== "totp") {
        setError(tAuth(authErrorKey(apiError)));
        return;
      }
      const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 });
      setStep({ kind: "scan", qr, secret: secretFromUri(data.totpURI), backupCodes: data.backupCodes });
      return;
    }
    const { error: apiError } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (apiError) {
      setError(tAuth(authErrorKey(apiError)));
      return;
    }
    toast(t("disabledToast"));
    setStep({ kind: "idle" });
    router.refresh();
  }

  async function submitCode(event: SubmitEvent<HTMLFormElement>, backupCodes: string[]) {
    event.preventDefault();
    setError(null);
    const parsed = totpSchema.safeParse({ code: new FormData(event.currentTarget).get("code") });
    if (!parsed.success) {
      setError(tAuth("invalidCode"));
      return;
    }
    setPending(true);
    const { error: apiError } = await authClient.twoFactor.verifyTotp({ code: parsed.data.code });
    setPending(false);
    if (apiError) {
      setError(tAuth("invalidCode"));
      return;
    }
    setStep({ kind: "backup", backupCodes });
  }

  return (
    <section aria-labelledby="deux-facteurs" className="border-t py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="deux-facteurs" className="text-xl font-semibold text-fg">
          {t("twoFactorTitle")}
        </h2>
        <Badge tone={enabled ? "accent" : "warning"}>{enabled ? t("twoFactorEnabled") : t("twoFactorDisabled")}</Badge>
      </div>
      <p className="mt-2 text-muted">{t("twoFactorIntro")}</p>
      <div className="mt-6 flex flex-col gap-5">
        <FormAlert message={error} />
        {step.kind === "idle" ? (
          <Button
            variant={enabled ? "secondary" : "primary"}
            className="self-start"
            onClick={() => setStep({ kind: "password", mode: enabled ? "disable" : "enable" })}
          >
            {enabled ? t("disable") : t("enable")}
          </Button>
        ) : null}

        {step.kind === "password" ? (
          <form onSubmit={(e) => void submitPassword(e, step.mode)} className="flex max-w-sm flex-col gap-4">
            <FormField
              name="password"
              type="password"
              label={tAuth("passwordLabel")}
              hint={t("passwordPrompt")}
              autoComplete="current-password"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? tAuth("pending") : step.mode === "enable" ? t("enable") : t("disable")}
              </Button>
              <Button variant="ghost" onClick={() => setStep({ kind: "idle" })}>
                {tCommon("cancel")}
              </Button>
            </div>
          </form>
        ) : null}

        {step.kind === "scan" ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold">{t("scanTitle")}</h3>
            <p className="text-muted">{t("scanIntro")}</p>
            {/* QR code généré localement (data URL), aucun service tiers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qr} alt={t("qrAlt")} width={220} height={220} className="rounded-md border bg-white p-2" />
            <p className="text-sm break-all text-muted">{t("manualKey", { secret: step.secret })}</p>
            <form onSubmit={(e) => void submitCode(e, step.backupCodes)} className="flex max-w-sm flex-col gap-4">
              <FormField name="code" label={tAuth("totpLabel")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? tAuth("pending") : t("confirmCode")}
              </Button>
            </form>
          </div>
        ) : null}

        {step.kind === "backup" ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold">{t("backupTitle")}</h3>
            <p className="text-muted">{t("backupIntro")}</p>
            <ul className="grid grid-cols-2 gap-2 rounded-md border bg-bg-elevated p-4 font-mono text-sm sm:grid-cols-3">
              {step.backupCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <Button
              className="self-start"
              onClick={() => {
                toast(t("enabledToast"));
                setStep({ kind: "idle" });
                router.refresh();
              }}
            >
              {t("backupDone")}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
