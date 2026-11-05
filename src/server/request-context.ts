import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { TRUSTED_IP_HEADER } from "./auth/constants";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

/** Contexte de la requête courante (identifiant de corrélation posé par src/proxy.ts). */
export const getRequestContext = cache(async (): Promise<RequestContext> => {
  const h = await headers();
  return {
    requestId: h.get(REQUEST_ID_HEADER) ?? crypto.randomUUID(),
    // Uniquement l'en-tête écrasé par le reverse proxy de confiance (jamais X-Forwarded-For).
    ip: h.get(TRUSTED_IP_HEADER),
    userAgent: h.get("user-agent"),
  };
});
