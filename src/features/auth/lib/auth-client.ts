"use client";

import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Client Better Auth (même origine). Les vérifications d'autorisation restent côté serveur. */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({ user: { birthYear: { type: "number", required: true } } }),
    // La redirection vers l'étape 2FA est gérée par le formulaire de connexion (router.push).
    twoFactorClient(),
  ],
});
