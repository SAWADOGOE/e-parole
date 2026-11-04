import { db } from "@/server/db";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

/** Liveness + readiness (base de données). Aucune information de configuration n'est exposée. */
export async function GET(): Promise<Response> {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logger.error({ err: error }, "healthcheck : base de données injoignable");
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
