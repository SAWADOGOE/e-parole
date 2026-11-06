import { SSE_HEARTBEAT_MS, SSE_MAX_DURATION_MS, SSE_SESSION_RECHECK_MS, subscribeToNotifications, unreadCountFor } from "@/features/notifications";
import { isSessionStillValid } from "@/server/auth/session-repository";
import { authenticatedRoute } from "@/server/http/route-handler";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Plusieurs événements rapprochés (réactions en rafale) ne déclenchent qu'un seul comptage. */
const COUNT_DEBOUNCE_MS = 1_000;

/**
 * Flux SSE du compteur de notifications (ADR-005, ADR-013) : session et Origin vérifiés, une connexion LISTEN partagée
 * par processus, seul le nombre de non-lues est envoyé. Trois flux au plus par membre, session revérifiée chaque minute
 * (suspension, révocation), recyclage après 10 min.
 */
export function GET(request: Request): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "notification.stream" }, (session) => {
    const encoder = new TextEncoder();
    const actor = session.actor;
    let cleanup = (): void => undefined;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        let pending: ReturnType<typeof setTimeout> | null = null;
        const send = (chunk: string): void => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            // Flux déjà annulé par le client : on arrête d'écrire, sans exception non interceptée.
            closed = true;
          }
        };
        const pushCount = async (): Promise<void> => {
          try {
            send(`event: count\ndata: ${JSON.stringify({ unread: await unreadCountFor(actor) })}\n\n`);
          } catch (error: unknown) {
            logger.warn({ err: error }, "compteur de notifications indisponible");
          }
        };
        const schedulePush = (): void => {
          pending ??= setTimeout(() => {
            pending = null;
            void pushCount();
          }, COUNT_DEBOUNCE_MS);
        };
        send("retry: 10000\n\n");
        const unsubscribe = await subscribeToNotifications(actor.userId, schedulePush, () => cleanup());
        // Client parti pendant l'abonnement (première connexion LISTEN sur réseau lent) : rien ne doit rester actif.
        if (request.signal.aborted || cancelled) {
          closed = true;
          unsubscribe();
          return;
        }
        const heartbeat = setInterval(() => send(": ping\n\n"), SSE_HEARTBEAT_MS);
        const recheck = setInterval(() => {
          void isSessionStillValid(session.sessionId, actor.userId)
            .then((valid) => {
              if (!valid) cleanup();
            })
            .catch(() => cleanup());
        }, SSE_SESSION_RECHECK_MS);
        const recycle = setTimeout(() => cleanup(), SSE_MAX_DURATION_MS);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearInterval(recheck);
          clearTimeout(recycle);
          if (pending) clearTimeout(pending);
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
        cancelled = true;
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
