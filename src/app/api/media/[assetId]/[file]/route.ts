import { assetIdSchema, openVariant, variantFileSchema } from "@/features/media";
import { canViewAsset, isAssetLinkedToContent } from "@/features/social";
import { AppError } from "@/server/errors/app-error";
import { authenticatedRoute } from "@/server/http/route-handler";
import { can } from "@/server/policies";

export const dynamic = "force-dynamic";

/**
 * Sert une variante d'image (ADR-012) : jamais d'URL de stockage exposée. Membre connecté seulement, et seulement
 * si le contenu qui porte l'image lui est visible (blocage compris). Cache privé : la réponse dépend du lecteur.
 */
export function GET(request: Request, context: RouteContext<"/api/media/[assetId]/[file]">): Promise<Response> {
  return authenticatedRoute(request, {}, async (session) => {
    const params = await context.params;
    const assetId = assetIdSchema.safeParse(params.assetId);
    const file = variantFileSchema.safeParse(params.file);
    if (!assetId.success || !file.success) throw new AppError("NOT_FOUND");
    const staff = can(session.actor, "moderation:case:read") && (await isAssetLinkedToContent(assetId.data));
    if (!staff && !(await canViewAsset(session.actor.userId, assetId.data))) throw new AppError("NOT_FOUND");
    const variant = await openVariant(assetId.data, file.data.width, file.data.format);
    if (!variant) throw new AppError("NOT_FOUND");
    return new Response(variant.body, {
      headers: {
        "Content-Type": variant.contentType,
        ...(variant.length !== null ? { "Content-Length": String(variant.length) } : {}),
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": "inline",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  });
}
