import { assetRefSchema, completeUpload } from "@/features/media";
import { parseInput } from "@/server/actions/parse-input";
import { authenticatedRoute } from "@/server/http/route-handler";

export const dynamic = "force-dynamic";

/** Étape 2 : l'envoi est confirmé, le worker vérifie et ré-encode (job media.process). Asset d'autrui : 404. */
export function POST(request: Request, context: RouteContext<"/api/uploads/[assetId]/complete">): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "upload.request" }, async (session) => {
    const input = parseInput(assetRefSchema, { assetId: (await context.params).assetId });
    return Response.json(await completeUpload(session.actor, input), { headers: { "Cache-Control": "no-store" } });
  });
}
