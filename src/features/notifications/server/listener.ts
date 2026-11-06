import "server-only";
import pg from "pg";
import { getEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { NOTIFY_CHANNEL, SSE_MAX_STREAMS_PER_USER } from "../constants";

/**
 * Une seule connexion LISTEN par processus web, partagée par tous les flux SSE (ADR-013). Elle vit hors de
 * src/server/db car LISTEN exige une connexion dédiée et durable, que le pool de Prisma ne fournit pas.
 * La charge utile NOTIFY est l'identifiant du destinataire : chaque flux ne réagit qu'aux siens.
 */
type Listener = () => void;

interface Hub {
  subscribers: Map<string, Set<Listener>>;
  client: pg.Client | null;
  connecting: Promise<void> | null;
  retryDelayMs: number;
  /** Fermeture d'un flux évincé (plafond par membre). */
  evictions: Map<Listener, () => void>;
}

const globalForHub = globalThis as unknown as { eparoleNotificationHub?: Hub };
const hub: Hub = (globalForHub.eparoleNotificationHub ??= { subscribers: new Map(), client: null, connecting: null, retryDelayMs: 1_000, evictions: new Map() });

const MAX_RETRY_DELAY_MS = 60_000;

function notifyAll(): void {
  for (const listeners of hub.subscribers.values()) for (const listener of listeners) listener();
}

/** Reconnexion avec délai croissant tant que des flux attendent ; après reprise, chacun reçoit son compteur à jour. */
function scheduleReconnect(): void {
  const delay = hub.retryDelayMs;
  hub.retryDelayMs = Math.min(hub.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
  setTimeout(() => {
    if (hub.subscribers.size === 0) return;
    ensureConnected()
      .then(notifyAll)
      .catch(() => scheduleReconnect());
  }, delay);
}

async function connect(): Promise<void> {
  const client = new pg.Client({ connectionString: getEnv().DATABASE_URL });
  client.on("notification", (message) => {
    if (message.channel !== NOTIFY_CHANNEL || !message.payload) return;
    for (const listener of hub.subscribers.get(message.payload) ?? []) listener();
  });
  client.on("error", (error: unknown) => {
    logger.warn({ err: error }, "connexion LISTEN des notifications perdue");
    if (hub.client === client) hub.client = null;
    void client.end().catch(() => undefined);
    scheduleReconnect();
  });
  await client.connect();
  await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
  hub.client = client;
  hub.retryDelayMs = 1_000;
}

function ensureConnected(): Promise<void> {
  if (hub.client) return Promise.resolve();
  hub.connecting ??= connect().finally(() => {
    hub.connecting = null;
  });
  return hub.connecting;
}

/**
 * Abonne un flux aux notifications d'un membre ; renvoie la fonction de désabonnement.
 * Au-delà de SSE_MAX_STREAMS_PER_USER flux ouverts par un même membre, le plus ancien est fermé (`evict`).
 */
export async function subscribe(userId: string, listener: Listener, evict: () => void): Promise<() => void> {
  await ensureConnected();
  const set = hub.subscribers.get(userId) ?? new Set<Listener>();
  const evictions = hub.evictions;
  set.add(listener);
  evictions.set(listener, evict);
  hub.subscribers.set(userId, set);
  while (set.size > SSE_MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value;
    if (!oldest) break;
    set.delete(oldest);
    evictions.get(oldest)?.();
    evictions.delete(oldest);
  }
  return () => {
    set.delete(listener);
    evictions.delete(listener);
    if (set.size === 0) hub.subscribers.delete(userId);
  };
}
