import "server-only";
import type { z } from "zod";
import { requireActor } from "../auth/session";
import { AppError, isAppError } from "../errors/app-error";
import { fail, ok, type Result } from "../errors/result";
import { logger, safeError } from "../logger";
import type { Actor } from "../policies";
import { enforceRateLimit, type RateLimitName } from "../rate-limit/rate-limit";
import { getRequestContext } from "../request-context";
import { parseInput } from "./parse-input";

export { parseInput, zodFieldErrors } from "./parse-input";

/** redirect() et notFound() de Next.js lèvent des erreurs de contrôle à laisser passer. */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"));
}

/** Convertit toute erreur en Result ; les erreurs inattendues sont journalisées sans données personnelles. */
export async function toResult<T>(run: () => Promise<T>): Promise<Result<T>> {
  const { requestId } = await getRequestContext();
  try {
    return ok(await run());
  } catch (error: unknown) {
    if (isAppError(error)) return fail(error.toPayload(requestId));
    if (isNextControlFlow(error)) throw error;
    logger.error({ err: safeError(error), requestId }, "erreur inattendue dans une action");
    return fail(new AppError("INTERNAL").toPayload(requestId));
  }
}

interface ActionOptions<S extends z.ZodType, T> {
  schema: S;
  rateLimit?: RateLimitName;
  handler: (actor: Actor, input: z.infer<S>) => Promise<T>;
}

/**
 * Server Action membre : session → rate limit → Zod → handler.
 * Le handler DOIT appeler authorize() avec la ressource réelle.
 */
export function action<S extends z.ZodType, T>(options: ActionOptions<S, T>) {
  return async (input: unknown): Promise<Result<T>> =>
    toResult(async () => {
      const actor = await requireActor();
      if (options.rateLimit) await enforceRateLimit(options.rateLimit, actor.userId);
      const data = parseInput(options.schema, input);
      return options.handler(actor, data);
    });
}
