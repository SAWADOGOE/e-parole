import type { NotificationTypeName, PreferenceType } from "./constants";

export interface NotificationActorView {
  handle: string;
  displayName: string;
}

export interface NotificationRow {
  id: string;
  type: NotificationTypeName;
  postId: string | null;
  commentId: string | null;
  data: Record<string, unknown>;
  read: boolean;
  updatedAt: Date;
  /** Acteurs distincts encore visibles du destinataire. */
  actorCount: number;
  /** Les deux plus récents, pour la phrase « Ruth et 4 autres personnes… ». */
  actors: NotificationActorView[];
}

export type NotificationPreferences = Record<PreferenceType, boolean>;

/** Phrase d'une notification regroupée : clé i18n et paramètres, calculés par une fonction pure. */
export interface NotificationMessage {
  key: string;
  values: Record<string, string | number>;
}
