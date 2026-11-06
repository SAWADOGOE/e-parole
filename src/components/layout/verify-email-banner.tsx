"use client";

import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/cn";
import { notify, notifyError } from "@/lib/notify";

export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("banner");
  const [pending, setPending] = useState(false);

  /**
   * Le client d'authentification n'est chargé qu'au clic : importé par le layout, il pesait sur le JS initial de
   * chaque page membre, même quand la bannière n'est pas affichée.
   */
  async function resend() {
    setPending(true);
    try {
      const { authClient } = await import("@/features/auth/lib/auth-client");
      await authClient.sendVerificationEmail({ email, callbackURL: "/verification?statut=ok" });
      notify(t("verifyEmailSent"));
    } catch {
      notifyError(t("verifyEmailFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div role="status" className="border-b border-gold bg-bg-elevated">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <MailWarning aria-hidden="true" className="size-5 shrink-0 text-gold-fg" />
        <p className="min-w-0 flex-1 text-fg">{t("verifyEmail")}</p>
        <button type="button" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-11")} onClick={() => void resend()} disabled={pending}>
          {t("verifyEmailAction")}
        </button>
      </div>
    </div>
  );
}
