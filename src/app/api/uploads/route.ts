import { requestUpload, uploadRequestSchema } from "@/features/media";
import { parseInput } from "@/server/actions/parse-input";
import { authenticatedRoute, readJson } from "@/server/http/route-handler";

export const dynamic = "force-dynamic";

/** Étape 1 de l'envoi (ADR-004) : { purpose, mime, size } → URL PUT présignée de 60 s et identifiant d'asset. */
export function POST(request: Request): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "upload.request" }, async (session) => {
    const input = parseInput(uploadRequestSchema, await readJson(request));
    return Response.json(await requestUpload(session.actor, input), { headers: { "Cache-Control": "no-store" } });
  });
}
