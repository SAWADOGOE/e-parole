"use client";

import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { FEED_PREFETCH_RATIO } from "../constants";
import { loadPostPageAction, type RenderedPage } from "../server/feed-actions";

export type PagerSource = { kind: "feed"; feed: "following" | "discover" } | { kind: "profile"; userId: string } | { kind: "bookmarks" };

interface FeedPagerProps {
  source: PagerSource;
  initialCursor: string | null;
  initialPastFresh: boolean;
  /** Lien de la page suivante sans JavaScript (pagination classique). */
  fallbackHref: Route | null;
  moreLabel: string;
  children: ReactNode;
}


/**
 * Pagination du fil : la page suivante est demandée quand 80 % de la page courante a défilé, tant que les publications
 * datent de moins de 48 h ; ensuite, seulement sur demande (« Tu es à jour », pas de défilement sans fin).
 * Les pages arrivent déjà rendues par le serveur : aucun composant de publication n'est envoyé au navigateur.
 */
export function FeedPager({ source, initialCursor, initialPastFresh, fallbackHref, moreLabel, children }: FeedPagerProps) {
  const t = useTranslations("home");
  const [pages, setPages] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pastFresh, setPastFresh] = useState(initialPastFresh);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [announcement, setAnnouncement] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  /** Page demandée au clavier ou au clic : le focus ira sur sa première publication (rien ne retombe sur la page). */
  const focusNewPage = useRef(false);

  useEffect(() => {
    if (!focusNewPage.current || pages.length === 0) return;
    focusNewPage.current = false;
    const lastPage = container.current?.querySelector<HTMLElement>(`[data-page="${pages.length}"] [data-feed-item]`);
    lastPage?.focus();
  }, [pages.length]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading.current) return;
    loading.current = true;
    setStatus("loading");
    try {
      const result = await loadPostPageAction({ source, cursor, markerShown: pastFresh });
      if (!result.ok) throw new Error(result.error.code);
      const page: RenderedPage = result.data;
      setPages((current) => [...current, page.node]);
      setCursor(page.nextCursor);
      setPastFresh(page.pastFresh);
      setStatus("idle");
      setAnnouncement(t("loaded", { count: page.count }));
    } catch {
      setStatus("error");
    } finally {
      loading.current = false;
    }
  }, [cursor, pastFresh, source, t]);

  useEffect(() => {
    const root = container.current;
    if (!root || !cursor || pastFresh || status !== "idle" || typeof IntersectionObserver === "undefined") return;
    const items = root.querySelectorAll("[data-feed-item]");
    const pageSize = pages.length === 0 ? items.length : Math.max(1, Math.ceil(items.length / (pages.length + 1)));
    const target = items[Math.max(0, items.length - pageSize + Math.floor(pageSize * FEED_PREFETCH_RATIO) - 1)];
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadMore();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, pastFresh, pages.length, status, loadMore]);

  return (
    <div ref={container}>
      {children}
      {pages.map((page, index) => (
        <div key={index} className="contents" data-page={index + 1}>
          {page}
        </div>
      ))}
      <div aria-live="polite" className="py-4 text-center text-sm text-muted">
        {status === "loading" ? t("loadingMore") : status === "idle" ? <span className="sr-only">{announcement}</span> : null}
        {status === "error" ? (
          <span className="flex flex-col items-center gap-2">
            {t("loadFailed")}
            <button type="button" className={buttonVariants({ variant: "secondary" })} onClick={() => void loadMore()}>
              {t("retry")}
            </button>
          </span>
        ) : null}
      </div>
      {cursor && status !== "error" ? (
        <div className="flex justify-center pb-4">
          {fallbackHref ? (
            // Lien stylé sans Slot de Radix : il reste hors du JS initial du fil (docs/29).
            <a
              href={fallbackHref}
              className={buttonVariants({ variant: "secondary" })}
              aria-disabled={status === "loading" || undefined}
              onClick={(event) => {
                event.preventDefault();
                if (status === "loading") return;
                focusNewPage.current = true;
                void loadMore();
              }}
            >
              {pastFresh ? moreLabel : t("loadMore")}
            </a>
          ) : null}
        </div>
      ) : null}
      {!cursor && (pages.length > 0 || initialCursor) ? <p className="pb-6 text-center text-sm text-muted">{t("endOfFeed")}</p> : null}
    </div>
  );
}
