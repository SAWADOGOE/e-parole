import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { profilePath } from "../lib/paths";
import type { CommentView } from "../types";
import { Avatar } from "./avatar";
import { CommentActions } from "./comment-actions";
import { ReactionBar } from "./reaction-bar";
import { RichText } from "./rich-text";

interface ThreadContext {
  postId: string;
  isPostAuthor: boolean;
  locked: boolean;
  dataSaver: boolean;
  resolveVerse: (candidate: string) => string | null;
}

async function CommentItem({ comment, ctx }: { comment: CommentView; ctx: ThreadContext }) {
  const t = await getTranslations("social");
  const tPage = await getTranslations("postPage");
  const format = await getFormatter();
  return (
    <article aria-label={t("commentBy", { name: comment.author.displayName })} className="flex gap-3 py-4">
      <Avatar name={comment.author.displayName} image={comment.author.avatar} size="sm" dataSaver={ctx.dataSaver} />
      <div className="min-w-0 flex-1">
        {comment.deleted ? (
          <p className="text-sm text-muted italic">{t("deletedComment")}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
              <Link href={profilePath(comment.author.handle)} className="font-semibold text-fg underline-offset-4 hover:underline">
                {comment.author.displayName}
              </Link>
              <span className="text-muted">
                <time dateTime={comment.createdAt.toISOString()}>{format.relativeTime(comment.createdAt)}</time>
                {comment.editedAt ? ` (${t("editedComment")})` : null}
              </span>
            </p>
            {comment.isHidden ? <p className="mt-1 text-sm text-warning">{t("hiddenCommentNotice")}</p> : null}
            {comment.hiddenByPostAuthor ? <p className="mt-1 text-sm text-warning">{t("hiddenByAuthorNotice")}</p> : null}
            <RichText text={comment.body} mentions={comment.mentions} resolveVerse={ctx.resolveVerse} className="mt-1 text-base break-words whitespace-pre-line text-fg" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <ReactionBar target="comment" targetId={comment.id} counts={comment.reactions} viewerReaction={comment.viewerReaction} compact />
              <CommentActions
                postId={ctx.postId}
                commentId={comment.id}
                replyParentId={comment.parentId === null ? comment.id : null}
                authorName={comment.author.displayName}
                body={comment.body}
                isOwn={comment.isOwn}
                isPostAuthor={ctx.isPostAuthor}
                hiddenByPostAuthor={comment.hiddenByPostAuthor}
                locked={ctx.locked}
              />
            </div>
          </>
        )}
        {comment.replies.length > 0 ? (
          <ul aria-label={tPage("repliesLabel", { name: comment.author.displayName })} className="mt-1 border-l pl-3">
            {comment.replies.map((reply) => (
              <li key={reply.id}>
                <CommentItem comment={reply} ctx={ctx} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

/** US-11 : commentaires et réponses sur un seul niveau, sémantique simple (liste d'articles). */
export function CommentThread({ comments, ctx }: { comments: readonly CommentView[]; ctx: ThreadContext }) {
  return (
    <ul className="divide-y">
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentItem comment={comment} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}
