import { assetRefSchema, getAssetStatus } from "@/features/media";
import { parseInput } from "@/server/actions/parse-input";
import { authenticatedRoute } from "@/server/http/route-handler";

export const dynamic = "force-dynamic";

/** État d'un envoi : le composer attend READY avant d'afficher l'image. Asset d'autrui : 404. */
export function GET(request: Request, context: RouteContext<"/api/uploads/[assetId]">): Promise<Response> {
  return authenticatedRoute(request, { rateLimit: "feed.page" }, async (session) => {
    const input = parseInput(assetRefSchema, { assetId: (await context.params).assetId });
    return Response.json(await getAssetStatus(session.actor, input), { headers: { "Cache-Control": "no-store" } });
  });
}
