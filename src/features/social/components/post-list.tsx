import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FRESH_WINDOW_HOURS } from "../constants";
import type { PostView } from "../types";
import { PostItem, type PostRenderContext } from "./post-item";

/** Index de la première publication plus ancienne que 48 h, ou -1. */
export function freshBoundary(posts: readonly PostView[], now: number = Date.now()): number {
  return posts.findIndex((post) => now - post.createdAt.getTime() > FRESH_WINDOW_HOURS * 3_600_000);
}

/** Repère « Tu es à jour » (docs/14) : le fil ne continue plus seul au-delà des 48 dernières heures. */
export async function UpToDate() {
  const t = await getTranslations("home");
  return (
    <section aria-labelledby="a-jour" className="my-6 flex flex-col items-center gap-2 border-y border-gold py-6 text-center" data-up-to-date="">
      <CheckCircle2 aria-hidden="true" className="size-6 text-gold-fg" strokeWidth={1.75} />
      <h3 id="a-jour" className="font-serif text-xl text-fg">
        {t("upToDateTitle")}
      </h3>
      <p className="max-w-md text-sm text-muted">{t("upToDateBody")}</p>
    </section>
  );
}

/** Une page de fil. `markerShown` : le repère a déjà été placé dans une page précédente. */
/** headingLevel : 3 sous le titre de section d'un fil ou d'un profil, 2 directement sous le titre de page (favoris). */
export function PostList({ posts, ctx, markerShown, headingLevel = 3 }: { posts: readonly PostView[]; ctx: PostRenderContext; markerShown: boolean; headingLevel?: 2 | 3 }) {
  const boundary = markerShown ? -1 : freshBoundary(posts);
  return (
    <>
      {posts.map((post, index) => (
        <div key={post.id} className="contents">
          {index === boundary ? <UpToDate /> : null}
          <PostItem post={post} ctx={ctx} headingLevel={headingLevel} />
        </div>
      ))}
    </>
  );
}
