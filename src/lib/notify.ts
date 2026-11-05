/**
 * Message de confirmation discret. sonner n'est chargé qu'au premier message : sur le lecteur, un visiteur qui se
 * contente de lire ne télécharge pas cette bibliothèque.
 */
export function notify(message: string): void {
  void import("sonner").then(({ toast }) => toast(message));
}
