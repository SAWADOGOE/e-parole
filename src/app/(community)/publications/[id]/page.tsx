import { Lock, MessageCircle } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { buildRenderContext, getPost, postComments } from "@/features/social";
import { CommentForm } from "@/features/social/components/comment-form";
import { CommentThread } from "@/features/social/components/comment-thread";
import { PostItem } from "@/features/social/components/post-item";
import { getCurrentSession } from "@/server/auth/session";

/** Aucun contenu de la publication dans les métadonnées : un titre générique suffit (noindex global). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("postPage");
  return { title: t("metaTitle") };
}

const ID = /^[a-z0-9]{1,64}$/;

/** Publication et commentaires. Invisible (supprimée, masquée, auteur bloqué dans un sens ou dans l'autre) → 404. */
export default async function PostPage(props: PageProps<"/publications/[id]">) {
  const { id } = await props.params;
  const session = await getCurrentSession();
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(`/publications/${id}`)}`);
  if (!ID.test(id)) notFound();
  const search = await props.searchParams;
  const cursor = typeof search["commentaires"] === "string" ? search["commentaires"] : undefined;
  const post = await getPost(session.actor, id);
  if (!post) notFound();
  const [comments, ctx] = await Promise.all([postComments(session.actor, id, cursor), buildRenderContext([post])]);
  if (!comments) notFound();
  const t = await getTranslations("postPage");
  const tSocial = await getTranslations("social");

  return (
    <>
      <p>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">
          ← {t("back")}
        </Link>
      </p>
      <h1 className="sr-only">{tSocial("byAuthor", { name: post.author.displayName })}</h1>
      <PostItem post={post} ctx={ctx} onPostPage />

      <section id="commentaires" aria-labelledby="titre-commentaires" className="mt-6 scroll-mt-24">
        <h2 id="titre-commentaires" tabIndex={-1} className="flex items-center gap-2 text-xl font-semibold text-fg">
          <MessageCircle aria-hidden="true" className="size-5 text-accent" />
          {t("commentsTitle")} <span className="text-base font-normal text-muted tabular-nums">({post.commentCount})</span>
        </h2>
        <div className="mt-4">
          {post.commentsLocked ? (
            <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted">
              <Lock aria-hidden="true" className="size-4" />
              {tSocial("commentsLocked")}
            </p>
          ) : (
            <CommentForm mode={{ kind: "new", postId: post.id, parentId: null }} />
          )}
        </div>
        {comments.items.length === 0 && !cursor ? (
          <EmptyState icon={MessageCircle} title={t("commentsTitle")} body={t("commentsEmpty")} className="py-8" />
        ) : (
          <div className="mt-4">
            <CommentThread
              comments={comments.items}
              ctx={{ postId: post.id, isPostAuthor: post.isOwn, locked: post.commentsLocked, dataSaver: ctx.dataSaver, resolveVerse: ctx.resolveVerse }}
            />
          </div>
        )}
        {comments.nextCursor ? (
          <div className="mt-4 flex justify-center">
            <Button asChild variant="secondary">
              <Link href={`/publications/${post.id}?commentaires=${encodeURIComponent(comments.nextCursor)}#commentaires` as Route}>{t("moreComments")}</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </>
  );
}
