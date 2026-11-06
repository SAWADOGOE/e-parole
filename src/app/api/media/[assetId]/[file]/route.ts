import { assetIdSchema, openVariant, variantFileSchema } from "@/features/media";
import { isAssetInEvidence } from "@/features/moderation";
import { canViewAsset } from "@/features/social";
import { evaluateAdminGate } from "@/server/auth/session";
import { AppError } from "@/server/errors/app-error";
import { authenticatedRoute } from "@/server/http/route-handler";
import { can } from "@/server/policies";

export const dynamic = "force-dynamic";

/**
 * Sert une variante d'image (ADR-012) : jamais d'URL de stockage exposée. Membre connecté seulement, et seulement
 * si le contenu qui porte l'image lui est visible (blocage compris). Les modérateurs ne voient que les images citées par un
 * signalement. Cache privé : la réponse dépend du lecteur.
 */
export function GET(request: Request, context: RouteContext<"/api/media/[assetId]/[file]">): Promise<Response> {
  return authenticatedRoute(request, {}, async (session) => {
    const params = await context.params;
    const assetId = assetIdSchema.safeParse(params.assetId);
    const file = variantFileSchema.safeParse(params.file);
    if (!assetId.success || !file.success) throw new AppError("NOT_FOUND");
    // Modération : session d'administration complète (MFA, âge) et image citée par un signalement, rien d'autre.
    const staff = can(session.actor, "moderation:case:read") && evaluateAdminGate(session).kind === "ok" && (await isAssetInEvidence(assetId.data));
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
