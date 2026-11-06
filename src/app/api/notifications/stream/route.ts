import { SSE_HEARTBEAT_MS, SSE_MAX_DURATION_MS, subscribeToNotifications, unreadCountFor } from "@/features/notifications";
import { authenticatedRoute } from "@/server/http/route-handler";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Flux SSE du compteur de notifications (ADR-005, ADR-013) : session et Origin vérifiés, une connexion LISTEN
 * partagée par processus, seul le nombre de non-lues est envoyé (jamais un contenu). Recyclé après 10 min.
 */
export function GET(request: Request): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "notification.read" }, (session) => {
    const encoder = new TextEncoder();
    const actor = session.actor;
    let cleanup = (): void => undefined;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (chunk: string): void => {
          if (!closed) controller.enqueue(encoder.encode(chunk));
        };
        const pushCount = async (): Promise<void> => {
          try {
            send(`event: count\ndata: ${JSON.stringify({ unread: await unreadCountFor(actor) })}\n\n`);
          } catch (error: unknown) {
            logger.warn({ err: error }, "compteur de notifications indisponible");
          }
        };
        send("retry: 10000\n\n");
        const unsubscribe = await subscribeToNotifications(actor.userId, () => void pushCount());
        const heartbeat = setInterval(() => send(": ping\n\n"), SSE_HEARTBEAT_MS);
        const recycle = setTimeout(() => cleanup(), SSE_MAX_DURATION_MS);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearTimeout(recycle);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Flux déjà fermé par le client.
          }
        };
        request.signal.addEventListener("abort", () => cleanup());
        await pushCount();
      },
      cancel() {
        cleanup();
      },
    });
    return Promise.resolve(
      new Response(stream, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
      }),
    );
  });
}
