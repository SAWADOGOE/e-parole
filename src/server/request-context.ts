import "server-only";
import { headers } from "next/headers";
import { cache } from "react";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

/** Contexte de la requête courante (identifiant de corrélation posé par src/proxy.ts). */
export const getRequestContext = cache(async (): Promise<RequestContext> => {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    requestId: h.get(REQUEST_ID_HEADER) ?? crypto.randomUUID(),
    ip: forwarded ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
});
