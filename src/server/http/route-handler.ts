import "server-only";
import { getCurrentSession, type CurrentSession } from "../auth/session";
import { getEnv } from "../env";
import { AppError, HTTP_STATUS, isAppError } from "../errors/app-error";
import { logger } from "../logger";
import { enforceRateLimit, type RateLimitName } from "../rate-limit/rate-limit";

/**
 * Requête de la même origine que l'application ? (docs/19 : les Route Handlers vérifient Origin.)
 * Un GET de même origine n'envoie pas toujours Origin : on se rabat alors sur Sec-Fetch-Site, envoyé par tous les
 * navigateurs récents. Sans aucun des deux (client non navigateur), la requête est refusée.
 */
export function isSameOrigin(request: Request): boolean {
  const expected = new URL(getEnv().APP_URL).origin;
  const origin = request.headers.get("origin");
  if (origin !== null) return origin === expected;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function errorResponse(error: AppError): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error.retryAfterSeconds !== undefined) headers["Retry-After"] = String(error.retryAfterSeconds);
  return Response.json({ error: error.toPayload() }, { status: HTTP_STATUS[error.code], headers });
}

interface RouteOptions {
  rateLimit?: RateLimitName;
}

/** Route Handler connecté : origine vérifiée, session, limite de débit, AppError → statut HTTP ; jamais de contenu journalisé. */
export async function authenticatedRoute(request: Request, options: RouteOptions, run: (session: CurrentSession) => Promise<Response>): Promise<Response> {
  try {
    if (!isSameOrigin(request)) throw new AppError("FORBIDDEN");
    const session = await getCurrentSession();
    if (!session) throw new AppError("UNAUTHENTICATED");
    if (options.rateLimit) await enforceRateLimit(options.rateLimit, session.actor.userId);
    return await run(session);
  } catch (error: unknown) {
    if (isAppError(error)) return errorResponse(error);
    logger.error({ err: error, path: new URL(request.url).pathname }, "erreur inattendue dans un Route Handler");
    return errorResponse(new AppError("INTERNAL"));
  }
}

/**
 * Corps JSON limité en taille, contrôlé AVANT lecture complète : Content-Length d'abord, puis comptage en flux
 * (un corps sans longueur annoncée est coupé dès qu'il dépasse la limite).
 */
export async function readJson(request: Request, maxBytes = 4096): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new AppError("VALIDATION");
  if (!request.body) throw new AppError("VALIDATION");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError("VALIDATION");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError("VALIDATION");
  }
}
