import { createHash } from "node:crypto";
import type { RateLimitName } from "../rate-limit/rate-limit";

export interface AccountLimit {
  name: RateLimitName;
  subject: string;
}

export const SIGN_IN_PATH = "/sign-in/email";

/** Routes qui envoient un email : chaque demande compte (protège la boîte de la victime contre le spam). */
const EMAIL_SENDING_LIMITS: Record<string, RateLimitName> = {
  "/request-password-reset": "auth.reset.account",
  "/send-verification-email": "auth.verification.account",
};

/** Sujet de limitation dérivé d'un email : normalisé puis haché (jamais stocké en clair). */
export function accountSubject(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

function hashedEmail(body: unknown): string | null {
  const email = (body as { email?: unknown } | null)?.email;
  if (typeof email !== "string" || email.trim().length === 0) return null;
  return accountSubject(email);
}

/**
 * Compteurs d'ÉCHECS de connexion (seuls les échecs sont comptés, cf. hook « after ») :
 * - email + IP : bloque la force brute depuis une source sans permettre à un tiers de verrouiller le compte ailleurs ;
 * - email seul, seuil large : freine une attaque distribuée sur un même compte.
 */
export function signInFailureLimits(body: unknown, ip: string | null): AccountLimit[] {
  const account = hashedEmail(body);
  if (!account) return [];
  return [
    { name: "auth.signin.failures.account_ip", subject: `${account}:${ip ?? "sans-ip"}` },
    { name: "auth.signin.failures.account", subject: account },
  ];
}

/** Limite par destinataire pour les routes qui envoient un email (email haché, jamais en clair). */
export function emailSendingLimit(path: string, body: unknown): AccountLimit | null {
  const name = EMAIL_SENDING_LIMITS[path];
  const account = hashedEmail(body);
  return name && account ? { name, subject: account } : null;
}
