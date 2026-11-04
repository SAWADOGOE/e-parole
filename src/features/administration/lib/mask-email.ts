/** Masque l'email par défaut (docs/admin/ADMIN-USER-MANAGEMENT.md) : a***@domaine. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}
