"use client";

import { Eye, EyeOff, Flag, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteCommentAction, hideCommentAction } from "../server/actions";
import { CommentForm } from "./comment-form";
import { ConfirmDialog } from "./confirm-dialog";
import { useActionRunner } from "./use-action-runner";

const ReportDialog = dynamic(() => import("@/features/moderation/components/report-dialog"), { ssr: false });

interface CommentActionsProps {
  postId: string;
  commentId: string;
  /** Commentaire de premier niveau : on peut lui répondre (un seul niveau). */
  replyParentId: string | null;
  authorName: string;
  body: string;
  isOwn: boolean;
  isPostAuthor: boolean;
  hiddenByPostAuthor: boolean;
  locked: boolean;
}

export function CommentActions({ postId, commentId, replyParentId, authorName, body, isOwn, isPostAuthor, hiddenByPostAuthor, locked }: CommentActionsProps) {
  const t = useTranslations("social");
  const { run } = useActionRunner();
  const [mode, setMode] = useState<"reply" | "edit" | null>(null);
  const [dialog, setDialog] = useState<"delete" | "report" | null>(null);
  const replyButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  /** Formulaire de réponse ou de modification refermé : le focus revient au bouton qui l'avait ouvert. */
  function closeForm(from: "reply" | "edit"): void {
    setMode(null);
    requestAnimationFrame(() => (from === "reply" ? replyButton.current : menuButton.current)?.focus());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {replyParentId && !locked ? (
          <Button ref={replyButton} variant="ghost" size="sm" aria-expanded={mode === "reply"} onClick={() => setMode(mode === "reply" ? null : "reply")}>
            <Reply aria-hidden="true" />
            {t("menu.reply")}
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger ref={menuButton} aria-label={t("menu.commentLabelFor", { name: authorName })} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwn ? (
              <>
                <DropdownMenuItem onSelect={() => setMode("edit")}>
                  <Pencil aria-hidden="true" />
                  {t("menu.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-danger">
                  <Trash2 aria-hidden="true" />
                  {t("menu.delete")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => setDialog("report")}>
                <Flag aria-hidden="true" />
                {t("menu.report")}
              </DropdownMenuItem>
            )}
            {isPostAuthor && !isOwn ? (
              <DropdownMenuItem onSelect={() => void run(() => hideCommentAction({ commentId, hidden: !hiddenByPostAuthor }), t(hiddenByPostAuthor ? "menu.unhideComment" : "menu.hideComment"))}>
                {hiddenByPostAuthor ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {t(hiddenByPostAuthor ? "menu.unhideComment" : "menu.hideComment")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {mode === "reply" && replyParentId ? (
        <CommentForm mode={{ kind: "new", postId, parentId: replyParentId, replyTo: authorName }} onDone={() => closeForm("reply")} focusOnMount />
      ) : null}
      {mode === "edit" ? <CommentForm mode={{ kind: "edit", commentId, body }} onDone={() => closeForm("edit")} focusOnMount /> : null}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title={t("deleteComment")}
        body={t("deleteCommentBody")}
        confirmLabel={t("menu.delete")}
        onConfirm={() => void run(() => deleteCommentAction({ commentId }), t("commentDeleted"))}
        returnFocus={() => document.getElementById("titre-commentaires")?.focus()}
      />
      {dialog === "report" ? <ReportDialog targetType="COMMENT" targetId={commentId} open onOpenChange={(open) => setDialog(open ? "report" : null)} returnFocus={() => menuButton.current?.focus()} /> : null}
    </div>
  );
}
