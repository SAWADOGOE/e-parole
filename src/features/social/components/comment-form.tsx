"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { notify } from "@/lib/notify";
import { COMMENT_BODY_MAX } from "../constants";
import { createCommentAction, updateCommentAction } from "../server/actions";

type Mode = { kind: "new"; postId: string; parentId: string | null; replyTo?: string } | { kind: "edit"; commentId: string; body: string };

/** Commentaire, réponse (un seul niveau) ou modification. */
export function CommentForm({ mode, onDone, focusOnMount: autoFocus = false }: { mode: Mode; onDone?: () => void; focusOnMount?: boolean }) {
  const t = useTranslations("postPage");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState(mode.kind === "edit" ? mode.body : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  // Le focus suit l'intention explicite de répondre ou de modifier, jamais le chargement de la page.
  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);
  const label = mode.kind === "edit" ? t("editComment") : mode.replyTo ? t("replyLabel", { name: mode.replyTo }) : t("commentLabel");

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        mode.kind === "edit"
          ? await updateCommentAction({ commentId: mode.commentId, body })
          : await createCommentAction({ postId: mode.postId, parentId: mode.parentId, body });
      if (!result.ok) {
        setError(result.error.code === "FORBIDDEN" ? result.error.message : tErrors(errorKey(result.error.code)));
        return;
      }
      setBody("");
      notify(t("commentSent"));
      onDone?.();
      router.refresh();
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
      <label htmlFor={`${id}-body`} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={`${id}-body`}
        value={body}
        maxLength={COMMENT_BODY_MAX}
        rows={3}
        required
        ref={field}
        placeholder={t("commentPlaceholder")}
        aria-describedby={`${id}-count`}
        onChange={(event) => setBody(event.target.value)}
        className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-base text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <p id={`${id}-count`} className="text-xs text-muted">
        {t("charactersLeft", { count: COMMENT_BODY_MAX - body.length })}
      </p>
      <FormAlert message={error} />
      <div className="flex justify-end gap-2">
        {onDone ? (
          <Button variant="ghost" onClick={onDone}>
            {mode.kind === "edit" ? t("cancel") : t("cancelReply")}
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !body.trim()}>
          {mode.kind === "edit" ? t("save") : mode.parentId ? t("replySubmit") : t("commentSubmit")}
        </Button>
      </div>
    </form>
  );
}
