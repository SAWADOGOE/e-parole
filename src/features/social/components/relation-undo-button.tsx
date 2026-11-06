"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { blockAction, muteAction } from "../server/actions";
import { useActionRunner } from "./use-action-runner";

/** Débloquer ou retirer de la sourdine (réglages de confidentialité). */
export function RelationUndoButton({ kind, userId, name }: { kind: "block" | "mute"; userId: string; name: string }) {
  const t = useTranslations("privacy");
  const tSocial = useTranslations("social");
  const { busy, run } = useActionRunner();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={busy}
      onClick={() =>
        void run(
          async () => {
            const result = kind === "block" ? await blockAction({ userId, active: false }) : await muteAction({ userId, active: false });
            return result.ok ? { ok: true as const, data: null } : result;
          },
          kind === "block" ? t("unblocked", { name }) : tSocial("unmuted", { name }),
        )
      }
    >
      {kind === "block" ? t("unblock", { name }) : t("unmute", { name })}
    </Button>
  );
}
