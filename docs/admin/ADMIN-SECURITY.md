# Sécurité de l'administration

| Contrôle | Détail |
|---|---|
| MFA | TOTP obligatoire pour tout rôle global, **vérifiée pour la session** (`mfaVerifiedAt`) ; codes de secours ; verrouillage après 5 échecs ; perte de MFA → procédure `SUPER_ADMIN` auditée |
| Sessions | 12 h max, liées à l'appareil ; révocation à tout changement de rôle |
| Ré-authentification | Mot de passe + TOTP < 10 min avant : suspension, bannissement, attribution de rôle, publication de traduction, paramètres critiques, révélation de PII |
| Autorisation | `adminAction` revérifie permission + hiérarchie à chaque appel ; layout = confort seulement |
| Réponse aux non-autorisés | 404 ; tentative journalisée (`security.admin_access_denied`) |
| Moindre privilège | Rôles fins, `SUPER_ADMIN` limité à 2 personnes ⚠️ ; pas de compte partagé |
| Séparation des tâches | Un relecteur n'approuve pas son propre contenu ; un modérateur ne juge pas l'appel de sa propre décision |
| Données privées | Aucune route admin ne lit `Message`, `BibleNote`, `PrayerRequest(PRIVATE)` ; vérifié par un test qui inspecte les requêtes des repositories admin |
| Exports | Réservés `SUPER_ADMIN`, motif obligatoire, fichier chiffré à durée de vie courte, audit |
| Rate limiting | Limites spécifiques admin (ex. 30 sanctions / heure / modérateur) pour limiter l'impact d'un compte compromis |
| Alertes | Nouvelle attribution de rôle élevé, > 20 suspensions en 1 h, connexion admin depuis un nouveau pays |
| Bris de glace | Procédure documentée en Phase 8 (compte d'urgence hors ligne, rotation des secrets) |

Tests requis : élévation de privilège (ADMIN → SUPER_ADMIN), contournement de hiérarchie, appel direct des Server
Actions admin par un `MEMBER`, accès aux données privées via les écrans admin (tous doivent échouer).
