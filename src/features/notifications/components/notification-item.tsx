import { AtSign, Bell, Heart, MessageCircle, Reply, ShieldAlert, UserPlus, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import type { NotificationTypeName } from "../constants";
import { groupMessage } from "../lib/group";
import type { NotificationRow } from "../types";

const ICON: Record<NotificationTypeName, LucideIcon> = {
  REACTION: Heart,
  COMMENT: MessageCircle,
  REPLY: Reply,
  MENTION: AtSign,
  FOLLOW: UserPlus,
  MODERATION: ShieldAlert,
  REPORT_REVIEWED: Bell,
};

function targetHref(row: NotificationRow): Route | null {
  if (row.type === "FOLLOW") {
    const first = row.actors[0];
    return first ? (`/@${first.handle}` as Route) : null;
  }
  if (row.type === "MODERATION" && row.data["decision"] === "REMOVE") return null;
  return row.postId ? (`/publications/${row.postId}${row.commentId ? "#commentaires" : ""}` as Route) : null;
}

/** Une notification regroupée : « Ruth et 4 autres personnes ont réagi ». Les acteurs bloqués ne comptent jamais. */
export async function NotificationItem({ row }: { row: NotificationRow }) {
  const t = await getTranslations("notifications");
  const format = await getFormatter();
  const message = groupMessage(row);
  const Icon = ICON[row.type];
  const href = targetHref(row);
  const reason = typeof row.data["reason"] === "string" ? row.data["reason"] : null;
  const until = typeof row.data["until"] === "string" ? new Date(row.data["until"]) : null;
  const text = t(message.key, message.values);
  return (
    <article className="flex gap-3 py-4">
      <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border", row.read ? "border-border text-muted" : "border-accent bg-accent-subtle text-accent")} aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base text-fg">
          {href ? (
            <Link href={href} className="underline-offset-4 hover:underline">
              {text}
            </Link>
          ) : (
            text
          )}
          {row.read ? null : <span className="ml-2 align-middle text-xs font-semibold text-accent">{t("unread")}</span>}
        </p>
        {row.type === "MODERATION" ? (
          <div className="mt-1 flex flex-col gap-1 text-sm text-muted">
            {reason ? <p>{t("moderationReason", { reason })}</p> : null}
            {until ? <p>{t("moderationUntil", { date: format.dateTime(until, { dateStyle: "long" }) })}</p> : null}
            <p>{t("moderationAppeal")}</p>
          </div>
        ) : null}
        <p className="mt-1 text-sm text-muted">
          <time dateTime={row.updatedAt.toISOString()}>{format.relativeTime(row.updatedAt)}</time>
        </p>
      </div>
    </article>
  );
}
