import { BadgeCheck, EyeOff, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { VerseQuote } from "@/features/bible/components/verse-quote";
import type { Passage } from "@/features/bible";
import { MediaPicture } from "@/features/media/components/media-picture";
import { postPath, profilePath } from "../lib/paths";
import type { PostView } from "../types";
import { Avatar } from "./avatar";
import { PostMenuLazy } from "./post-menu-lazy";
import { ReactionBar } from "./reaction-bar";
import { RichText } from "./rich-text";

export interface PostRenderContext {
  dataSaver: boolean;
  resolveVerse: (candidate: string) => string | null;
  passages: ReadonlyMap<string, Passage>;
  verseKey: (verse: NonNullable<PostView["verse"]>) => string;
}

/** Publication dans un fil : pas de carte, un filet et du rythme vertical (docs/14). Server Component, îlots client minimes. */
export async function PostItem({ post, ctx, headingLevel = 2, onPostPage = false }: { post: PostView; ctx: PostRenderContext; headingLevel?: 2 | 3; onPostPage?: boolean }) {
  const t = await getTranslations("social");
  const format = await getFormatter();
  const passage = post.verse ? ctx.passages.get(ctx.verseKey(post.verse)) : undefined;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `publication-${post.id}`;
  return (
    <article aria-labelledby={headingId} data-feed-item="" className="border-b py-5 first:pt-2">
      <header className="flex items-start gap-3">
        <Avatar name={post.author.displayName} image={post.author.avatar} dataSaver={ctx.dataSaver} />
        <div className="min-w-0 flex-1">
          <Heading id={headingId} className="flex flex-wrap items-center gap-x-1.5 text-base font-semibold text-fg">
            <Link href={profilePath(post.author.handle)} className="break-words underline-offset-4 hover:underline">
              {post.author.displayName}
            </Link>
            {post.author.verifiedBadge ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-fg">
                <BadgeCheck aria-hidden="true" className="size-4" />
                {t(`verified.${post.author.verifiedBadge}`)}
              </span>
            ) : null}
            <span className="sr-only">· {t(`types.${post.type}`)}</span>
          </Heading>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            <span className="break-all">@{post.author.handle}</span>
            <span aria-hidden="true">·</span>
            <span aria-hidden="true">{t(`types.${post.type}`)}</span>
            <span aria-hidden="true">·</span>
            <Link href={postPath(post.id)} className="underline-offset-4 hover:underline">
              <time dateTime={post.createdAt.toISOString()}>{format.relativeTime(post.createdAt)}</time>
            </Link>
            {post.editedAt ? <span>({t("edited")})</span> : null}
          </p>
        </div>
        <PostMenuLazy
          postId={post.id}
          isOwn={post.isOwn}
          bookmarked={post.bookmarked}
          commentsLocked={post.commentsLocked}
          author={{ userId: post.author.userId, displayName: post.author.displayName }}
          onPostPage={onPostPage}
        />
      </header>

      {post.isHidden ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-warning px-3 py-2 text-sm text-fg">
          <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("hiddenNotice")}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-4 pl-0 sm:pl-13">
        {post.body ? <RichText text={post.body} mentions={post.mentions} resolveVerse={ctx.resolveVerse} className="text-lg break-words whitespace-pre-line text-fg" /> : null}
        {passage ? <VerseQuote passage={passage} /> : null}
        {post.media.length > 0 ? (
          <ul className={post.media.length === 1 ? "grid gap-2" : "grid grid-cols-2 gap-2"} aria-label={t("imageAlt", { name: post.author.displayName })}>
            {post.media.map((item, index) => (
              <li key={item.image.assetId}>
                <MediaPicture
                  image={item.image}
                  alt={item.altText || t("imageOf", { index: index + 1, total: post.media.length })}
                  sizes={post.media.length === 1 ? "(min-width: 768px) 600px, 100vw" : "(min-width: 768px) 300px, 50vw"}
                  dataSaver={ctx.dataSaver}
                  showLabel={(kilobytes) => t("showImage", { size: `${kilobytes} Ko` })}
                  className={post.media.length === 1 ? "max-h-[32rem]" : "aspect-square"}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <footer className="flex flex-wrap items-center justify-between gap-2">
          <ReactionBar target="post" targetId={post.id} counts={post.reactions} viewerReaction={post.viewerReaction} />
          {onPostPage ? null : (
            <Link
              href={`${postPath(post.id)}#commentaires`}
              aria-label={`${t("comments", { count: post.commentCount })} — ${t("commentsLink", { name: post.author.displayName })}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-fg hover:bg-bg-subtle"
            >
              <MessageCircle aria-hidden="true" className="size-5" />
              {t("comments", { count: post.commentCount })}
            </Link>
          )}
        </footer>
      </div>
    </article>
  );
}
