import { test as base } from "@playwright/test";

/** IP de documentation (RFC 5737) aléatoire : simule l'en-tête X-Real-IP posé par le reverse proxy. */
export function randomClientIp(): string {
  return `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
}

/**
 * En production, le reverse proxy écrase X-Real-IP ; sans lui, toutes les requêtes partagent un compteur
 * de limitation de débit. Chaque test reçoit donc sa propre IP simulée.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.setExtraHTTPHeaders({ "x-real-ip": randomClientIp() });
    await provide(context);
  },
});

export { expect } from "@playwright/test";
