/** Exécuté une fois au démarrage du serveur Next.js (pas pendant le build). */
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  const { verifyDatabaseRoles } = await import("./server/db/startup-check");
  await verifyDatabaseRoles("web");
}
