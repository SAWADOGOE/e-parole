"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { UNREAD_EVENT } from "../lib/unread-event";

/**
 * Cloche (REQ-NOTIF-1) : le compteur initial vient du serveur ; le direct (SSE, repli polling 60 s) est chargé
 * quand le navigateur est inactif, pour rester hors du JS initial du fil (docs/29).
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const t = useTranslations("notifications");
  const [unread, setUnread] = useState(initialUnread);
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef(initialUnread);
  // Seules les hausses sont annoncées (pas les baisses dues à la lecture), en une phrase courte.
  useEffect(() => {
    if (unread > previous.current) setAnnouncement(t("newArrived", { count: unread - previous.current }));
    previous.current = unread;
  }, [unread, t]);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    const begin = (): void => {
      void import("../lib/live-count").then(({ startLiveCount }) => {
        if (!cancelled) stop = startLiveCount(setUnread);
      });
    };
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(begin, { timeout: 3000 })
        : setTimeout(begin, 1500);
    const onLocal = (event: Event): void => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === "number") setUnread(detail);
    };
    window.addEventListener(UNREAD_EVENT, onLocal);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function" && typeof idle === "number") cancelIdleCallback(idle);
      else clearTimeout(idle);
      stop?.();
      window.removeEventListener(UNREAD_EVENT, onLocal);
    };
  }, []);

  const label = unread > 0 ? t("bellUnread", { count: unread }) : t("bellLabel");
  return (
    <>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <Link
        href="/notifications"
        aria-label={label}
        className="relative inline-flex size-11 items-center justify-center rounded-md text-fg hover:bg-bg-subtle"
      >
        <Bell aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] leading-5 font-semibold text-brand-fg tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </>
  );
}
