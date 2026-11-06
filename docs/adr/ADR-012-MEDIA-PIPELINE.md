# ADR-012 — Images : bucket privé, variantes servies par l'application

- **Statut** : Accepté le 2026-11-06 par le propriétaire du projet
- **Date** : 2026-11-06
- **Précise** : [ADR-004](ADR-004-FILE-STORAGE.md)

## Contexte
ADR-004 prévoyait un bucket `public` servi par CDN pour les médias publics. Or en Phase 3 toute image de publication ou
de profil n'est visible que des membres connectés, et jamais d'une personne bloquée. Une URL de stockage permanente
contournerait ces deux règles. La CSP (`img-src 'self'`) n'autorise d'ailleurs pas d'autre origine d'image.

## Décision
- **Un seul bucket privé** en Phase 3. L'original est envoyé par URL présignée PUT (60 s, type et taille signés), puis
  supprimé par le worker après traitement. Le bucket `public` reste réservé à de futurs contenus réellement publics (CDN).
- **Pipeline (job `media.process`)** : taille réelle, magic bytes (JPEG, PNG, WebP), refus de SVG, GIF, HEIC et des images
  animées, décodage borné à 40 Mpx, ré-encodage AVIF (q 50) et WebP (q 72) en 320/640/960/1280 px sans agrandissement,
  avatar carré 320 px, bannière 3:1 ; aucune métadonnée conservée (EXIF, GPS, XMP) ; SHA-256 de l'original, couleur dominante.
- **Diffusion** : `/api/media/[assetId]/[largeur].[format]`, membre connecté, contrôle `canViewAsset` (propriétaire, ou contenu
  visible sans blocage), en-têtes `Cache-Control: private` et `Cross-Origin-Resource-Policy: same-origin`. Un modérateur ne voit
  que les images citées par la copie figée d'un signalement, et seulement avec une session d'administration complète (MFA).
- Nettoyage : les lignes sont supprimées d'abord par une requête qui revérifie qu'aucune publication, aucun profil ni aucun dossier
  ouvert ne cite l'image ; le stockage n'est vidé qu'ensuite (jamais d'image cassée).
- HEIC n'est pas accepté : les binaires précompilés de `sharp` ne le décodent pas, et iOS convertit en JPEG à l'envoi.
- Économie de données (en-tête `Save-Data` ou interrupteur du menu) : images derrière un `<details>` natif, variante 320 px.
- Quotas : 8 envois non terminés, 300 Mo de variantes par membre, 40 demandes par heure ; nettoyage quotidien
  (`media.cleanup`) des envois abandonnés (> 24 h) et des images jamais rattachées (> 7 jours).

## Conséquences
- ➕ Les règles de confidentialité s'appliquent aussi aux images ; aucune adresse de stockage n'est exposée.
- ➕ Poids mesurés sur des photos réelles : 960 px ≤ 71 Ko, 320 px ≤ 7 Ko (budgets 200 Ko et 60 Ko).
- ➖ Chaque image passe par le serveur web (pas de CDN) : coût de bande passante du VPS, à revoir avec la mise en production.
- ➖ La CSP `connect-src` inclut l'origine du stockage pour les envois présignés (`S3_PUBLIC_ENDPOINT`).
