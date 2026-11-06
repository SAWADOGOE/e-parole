"use client";

import { Bookmark, BookmarkX, Ban, Flag, Link2, Lock, LockOpen, MoreHorizontal, Pencil, Trash2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notify, notifyError } from "@/lib/notify";
import { postPath } from "../lib/paths";
import { blockAction, bookmarkAction, deletePostAction, lockCommentsAction, muteAction } from "../server/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { useActionRunner } from "./use-action-runner";

const ReportDialog = dynamic(() => import("@/features/moderation/components/report-dialog"), { ssr: false });

export interface PostMenuProps {
  postId: string;
  isOwn: boolean;
  bookmarked: boolean;
  commentsLocked: boolean;
  author: { userId: string; displayName: string };
  /** Sur la page de la publication, la suppression ramène au fil. */
  onPostPage?: boolean;
  /** Ouvert dès le montage : le menu est chargé à la demande par PostMenuLazy. */
  initialOpen?: boolean;
}

/** Menu « … » d'une publication : actions visibles sans survol ; chaque action est revérifiée côté serveur. */
export default function PostMenu({ postId, isOwn, bookmarked, commentsLocked, author, onPostPage = false, initialOpen = false }: PostMenuProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const { run } = useActionRunner();
  const [dialog, setDialog] = useState<"delete" | "block" | "report" | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = author.displayName;
  const returnFocus = (): void => trigger.current?.focus();

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${postPath(postId)}`);
      notify(t("menu.linkCopied"));
    } catch {
      notifyError(t("menu.linkCopied"));
    }
  }

  /** Après suppression dans un fil, le focus passe à la publication suivante (ou au contenu principal). */
  async function remove(): Promise<void> {
    const article = trigger.current?.closest("article");
    const next = article?.parentElement?.nextElementSibling?.querySelector<HTMLElement>("article") ?? document.getElementById("contenu");
    const done = await run(() => deletePostAction({ postId }), t("deleted"), { refresh: !onPostPage });
    if (done === null) return;
    if (onPostPage) router.push("/");
    else next?.focus();
  }

  return (
    <>
      <DropdownMenu defaultOpen={initialOpen}>
        <DropdownMenuTrigger ref={trigger} aria-label={t("menu.labelFor", { name })} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void run(() => bookmarkAction({ postId, saved: !bookmarked }), t(bookmarked ? "menu.unsaved" : "menu.saved"))}>
            {bookmarked ? <BookmarkX aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
            {t(bookmarked ? "menu.unsave" : "menu.save")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <Link2 aria-hidden="true" />
            {t("menu.copyLink")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isOwn ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`${postPath(postId)}/modifier`}>
                  <Pencil aria-hidden="true" />
                  {t("menu.edit")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void run(() => lockCommentsAction({ postId, locked: !commentsLocked }), t(commentsLocked ? "menu.unlocked" : "menu.locked"))}>
                {commentsLocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
                {t(commentsLocked ? "menu.unlock" : "menu.lock")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-danger">
                <Trash2 aria-hidden="true" />
                {t("menu.delete")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setDialog("report")}>
                <Flag aria-hidden="true" />
                {t("menu.report")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void run(() => muteAction({ userId: author.userId, active: true }), t("muted", { name }))}>
                <VolumeX aria-hidden="true" />
                {t("menu.mute", { name })}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("block")} className="text-danger">
                <Ban aria-hidden="true" />
                {t("menu.block", { name })}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={t("menu.delete")}
        onConfirm={() => void remove()}
        returnFocus={returnFocus}
      />
      <ConfirmDialog
        open={dialog === "block"}
        onOpenChange={(open) => setDialog(open ? "block" : null)}
        title={t("blockTitle", { name })}
        body={t("blockBody", { name })}
        confirmLabel={t("blockConfirm")}
        onConfirm={() => void run(() => blockAction({ userId: author.userId, active: true }), t("blocked", { name }))}
        returnFocus={() => document.getElementById("contenu")?.focus()}
      />
      {dialog === "report" ? <ReportDialog targetType="POST" targetId={postId} open onOpenChange={(open) => setDialog(open ? "report" : null)} returnFocus={returnFocus} /> : null}
    </>
  );
}
