import { POLL_INTERVAL_MS, SSE_MAX_FAILURES } from "../constants";

/**
 * Compteur en direct (ADR-013) : flux SSE ; après plusieurs échecs (réseau mobile, proxy) ou sans EventSource,
 * repli automatique en polling toutes les 60 s. Seul le nombre de non-lues circule. Renvoie la fonction d'arrêt.
 */
export function startLiveCount(onCount: (unread: number) => void): () => void {
  let source: EventSource | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;
  let failures = 0;
  let stopped = false;

  const poll = async (): Promise<void> => {
    try {
      const response = await fetch("/api/notifications/count", { cache: "no-store" });
      if (response.ok) onCount(((await response.json()) as { unread: number }).unread);
    } catch {
      // Hors ligne : le prochain essai suit dans 60 s.
    }
  };
  const startPolling = (): void => {
    if (poller || stopped) return;
    void poll();
    poller = setInterval(() => void poll(), POLL_INTERVAL_MS);
  };

  if (typeof EventSource === "undefined") startPolling();
  else {
    source = new EventSource("/api/notifications/stream");
    source.addEventListener("count", (event) => {
      failures = 0;
      const data = JSON.parse((event as MessageEvent<string>).data) as { unread?: unknown };
      if (typeof data.unread === "number") onCount(data.unread);
    });
    source.addEventListener("error", () => {
      failures += 1;
      if (failures >= SSE_MAX_FAILURES) {
        source?.close();
        source = null;
        startPolling();
      }
    });
  }
  return () => {
    stopped = true;
    source?.close();
    if (poller) clearInterval(poller);
  };
}
