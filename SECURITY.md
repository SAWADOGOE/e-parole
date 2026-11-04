# Politique de sécurité

## Signaler une vulnérabilité
Ne pas ouvrir d'issue publique. Écrire à l'adresse de sécurité du projet (à définir avant la mise en production,
voir les questions ouvertes de [docs/19-SECURITY.md](docs/19-SECURITY.md)). Inclure la description, l'impact, les étapes
de reproduction et les versions concernées. Accusé de réception visé sous 72 heures.

## Périmètre prioritaire
- Contournement d'autorisation (RBAC global, rôles de communauté, accès inter-communautés)
- Exposition de prières privées, de messages privés ou de champs de profil masqués
- Élévation de privilèges vers `/admin` ou `/manage`
- Uploads malveillants, XSS, injection, SSRF via les aperçus de liens
- Altération du texte biblique de référence

## Engagements
Correctifs critiques traités en priorité, avis publié après correction, crédit au découvreur s'il le souhaite.
Détails techniques : [docs/19-SECURITY.md](docs/19-SECURITY.md) et [docs/admin/ADMIN-SECURITY.md](docs/admin/ADMIN-SECURITY.md).
