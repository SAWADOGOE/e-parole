import "server-only";
import pg from "pg";
import { logger } from "@/server/logger";
import { NOTIFY_CHANNEL } from "../constants";

/**
 * Une seule connexion LISTEN par processus web, partagée par tous les flux SSE (ADR-013).
 * La charge utile NOTIFY est l'identifiant du destinataire : chaque flux ne réagit qu'aux siens.
 */
type Listener = () => void;

interface Hub {
  subscribers: Map<string, Set<Listener>>;
  client: pg.Client | null;
  connecting: Promise<void> | null;
}

const globalForHub = globalThis as unknown as { eparoleNotificationHub?: Hub };
const hub: Hub = (globalForHub.eparoleNotificationHub ??= { subscribers: new Map(), client: null, connecting: null });

const RECONNECT_DELAY_MS = 5_000;

async function connect(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const client = new pg.Client({ connectionString });
  client.on("notification", (message) => {
    if (message.channel !== NOTIFY_CHANNEL || !message.payload) return;
    for (const listener of hub.subscribers.get(message.payload) ?? []) listener();
  });
  client.on("error", (error: unknown) => {
    logger.warn({ err: error }, "connexion LISTEN des notifications perdue");
    hub.client = null;
    void client.end().catch(() => undefined);
    setTimeout(() => void ensureConnected().catch(() => undefined), RECONNECT_DELAY_MS);
  });
  await client.connect();
  await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
  hub.client = client;
}

function ensureConnected(): Promise<void> {
  if (hub.client) return Promise.resolve();
  hub.connecting ??= connect().finally(() => {
    hub.connecting = null;
  });
  return hub.connecting;
}

/** Abonne un flux aux notifications d'un membre ; renvoie la fonction de désabonnement. */
export async function subscribe(userId: string, listener: Listener): Promise<() => void> {
  await ensureConnected();
  const set = hub.subscribers.get(userId) ?? new Set<Listener>();
  set.add(listener);
  hub.subscribers.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) hub.subscribers.delete(userId);
  };
}
