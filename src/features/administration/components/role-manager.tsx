"use client";

import { formText } from "@/lib/form-data";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { FormAlert, FormField } from "@/components/shared/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GlobalRoleName } from "@/server/policies/roles";
import { changeRoleAction, reauthenticateAction } from "../server/actions";

interface RoleState {
  role: GlobalRoleName;
  held: boolean;
  /** Indication d'interface ; le serveur revérifie la permission. */
  manageable: boolean;
}

type Pending = { mode: "grant" | "revoke"; role: GlobalRoleName } | null;

export function RoleManager({ userId, userName, roles }: { userId: string; userName: string; roles: RoleState[] }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [confirming, setConfirming] = useState<Pending>(null);
  const [reauthFor, setReauthFor] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply(change: NonNullable<Pending>) {
    setBusy(true);
    setError(null);
    const result = await changeRoleAction(change.mode, { userId, role: change.role });
    setBusy(false);
    if (result.ok) {
      toast(t("roleChanged"));
      router.refresh();
      return;
    }
    if (result.error.code === "REAUTH_REQUIRED") {
      setReauthFor(change);
      return;
    }
    setError(result.error.message);
  }

  async function submitReauth(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const change = reauthFor;
    if (!change) return;
    const password = formText(new FormData(event.currentTarget), "password");
    setBusy(true);
    const result = await reauthenticateAction({ password });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.fieldErrors?.["password"]?.[0] ?? result.error.message);
      return;
    }
    setReauthFor(null);
    await apply(change);
  }

  return (
    <section aria-labelledby="roles" className="mt-10">
      <h2 id="roles" className="text-xl font-semibold text-fg">
        {t("rolesTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("rolesIntro")}</p>
      <div className="mt-4">
        <FormAlert message={error} />
      </div>
      <ul className="mt-4 divide-y rounded-lg border bg-bg-elevated">
        {roles.map(({ role, held, manageable }) => (
          <li key={role} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="font-medium">{t(`roles.${role}`)}</span>
              {held ? <Badge tone="accent">{t("roleHeld")}</Badge> : null}
            </span>
            {manageable ? (
              <Button
                size="sm"
                variant={held ? "secondary" : "primary"}
                disabled={busy}
                data-testid={`role-${role}-${held ? "revoke" : "grant"}`}
                onClick={() => setConfirming({ mode: held ? "revoke" : "grant", role })}
              >
                {held ? t("revoke") : t("grant")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirming
              ? confirming.mode === "grant"
                ? t("grantConfirmTitle", { role: t(`roles.${confirming.role}`) })
                : t("revokeConfirmTitle", { role: t(`roles.${confirming.role}`) })
              : null}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("roleConfirmBody", { name: userName })}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              danger={confirming?.mode === "revoke"}
              onClick={() => {
                const change = confirming;
                setConfirming(null);
                if (change) void apply(change);
              }}
            >
              {tCommon("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reauthFor !== null} onOpenChange={(open) => !open && setReauthFor(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("reauthTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("reauthIntro")}</AlertDialogDescription>
          <form method="post" onSubmit={(e) => void submitReauth(e)} className="flex flex-col gap-4">
            <FormField name="password" type="password" label={tAuth("passwordLabel")} autoComplete="current-password" required />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">{tCommon("cancel")}</AlertDialogCancel>
              <Button type="submit" disabled={busy}>
                {t("reauthSubmit")}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
