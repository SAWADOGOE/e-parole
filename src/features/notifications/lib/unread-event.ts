/** Synchronise la cloche quand une page change le nombre de non-lues (sans attendre le flux SSE). */
export const UNREAD_EVENT = "eparole:notifications-unread";

export function announceUnread(count: number): void {
  window.dispatchEvent(new CustomEvent<number>(UNREAD_EVENT, { detail: count }));
}
