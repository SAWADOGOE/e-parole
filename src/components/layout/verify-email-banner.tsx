"use client";

import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/lib/auth-client";

export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("banner");
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    await authClient.sendVerificationEmail({ email, callbackURL: "/verification?statut=ok" });
    setPending(false);
    toast(t("verifyEmailSent"));
  }

  return (
    <div role="status" className="border-b border-gold bg-bg-elevated">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <MailWarning aria-hidden="true" className="size-5 shrink-0 text-gold-fg" />
        <p className="min-w-0 flex-1 text-fg">{t("verifyEmail")}</p>
        <Button variant="link" size="sm" onClick={() => void resend()} disabled={pending}>
          {t("verifyEmailAction")}
        </Button>
      </div>
    </div>
  );
}
