const ERROR_DURATION_MS = 10_000;

/** Message discret. sonner est importé à la demande pour rester hors de la charge initiale de la page. */
export function notify(message: string): void {
  void import("sonner").then(({ toast }) => toast(message));
}

/** Une erreur reste assez longtemps pour être lue, et se ferme à la demande (WCAG 3.3.1). */
export function notifyError(message: string): void {
  void import("sonner").then(({ toast }) => toast(message, { duration: ERROR_DURATION_MS, closeButton: true }));
}
