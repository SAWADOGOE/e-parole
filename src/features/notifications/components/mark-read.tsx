"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "../server/actions";
import { announceUnread } from "../lib/unread-event";

/** Les notifications affichées sont marquées lues une fois la page vue (pas celles arrivées depuis). */
export function MarkRead({ before }: { before: string }) {
  useEffect(() => {
    void markNotificationsReadAction({ before })
      .then((result) => {
        if (result.ok) announceUnread(result.data.unread);
      })
      .catch(() => undefined);
  }, [before]);
  return null;
}
