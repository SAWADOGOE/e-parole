"use client";

import { Ban, Flag, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { blockAction, muteAction } from "../server/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { useActionRunner } from "./use-action-runner";

const ReportDialog = dynamic(() => import("@/features/moderation/components/report-dialog"), { ssr: false });

/** Actions sur le profil d'autrui : signaler, sourdine, bloquer (US-14, jamais notifié). */
export function ProfileMenu({ userId, name, muted }: { userId: string; name: string; muted: boolean }) {
  const t = useTranslations("social");
  const tPeople = useTranslations("people");
  const router = useRouter();
  const { busy, run } = useActionRunner();
  const [dialog, setDialog] = useState<"block" | "report" | null>(null);

  async function blockNow(): Promise<void> {
    const done = await run(() => blockAction({ userId, active: true }), t("blocked", { name }), { refresh: false });
    if (done) router.push("/");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={tPeople("profileMenu", { name })} disabled={busy} className="inline-flex size-11 items-center justify-center rounded-md border border-border-strong text-fg hover:bg-bg-subtle">
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("report")}>
            <Flag aria-hidden="true" />
            {tPeople("reportProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void run(() => muteAction({ userId, active: !muted }), t(muted ? "unmuted" : "muted", { name }))}>
            {muted ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            {t(muted ? "menu.unmute" : "menu.mute", { name })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("block")} className="text-danger">
            <Ban aria-hidden="true" />
            {t("menu.block", { name })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={dialog === "block"}
        onOpenChange={(open) => setDialog(open ? "block" : null)}
        title={t("blockTitle", { name })}
        body={t("blockBody", { name })}
        confirmLabel={t("blockConfirm")}
        onConfirm={() => void blockNow()}
      />
      {dialog === "report" ? <ReportDialog targetType="PROFILE" targetId={userId} open onOpenChange={(open) => setDialog(open ? "report" : null)} /> : null}
    </>
  );
}
