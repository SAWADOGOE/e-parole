import { unreadCountFor } from "@/features/notifications";
import { authenticatedRoute } from "@/server/http/route-handler";

export const dynamic = "force-dynamic";

/** Repli en polling (60 s) quand le flux SSE est indisponible. */
export function GET(request: Request): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "notification.read" }, async (session) =>
    Response.json({ unread: await unreadCountFor(session.actor) }, { headers: { "Cache-Control": "no-store" } }),
  );
}
