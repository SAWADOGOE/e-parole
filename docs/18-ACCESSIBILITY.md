# 18 — Accessibilité

Cible : **WCAG 2.2 niveau AA** sur les trois espaces.

## Exigences concrètes
| Critère | Application e-Parole |
|---|---|
| 1.4.3 Contraste (4,5:1 / 3:1 grand texte) | Tokens vérifiés ([15](15-DESIGN-SYSTEM.md#couleurs)) ; `#2C8273` et l'or interdits pour le petit texte sur clair |
| 1.4.11 Contraste non textuel (3:1) | Bordures d'inputs `ink-500` `#6B777C` (4,23:1 sur ivoire), focus ring |
| 1.4.4 / 1.4.10 Redimensionnement et reflow | Lecteur jusqu'à 200 % sans scroll horizontal à 320 px |
| 1.4.12 Espacement du texte | Réglage d'interligne du lecteur, aucune hauteur fixe sur les blocs de texte |
| 2.1.1 Clavier | Tout est utilisable au clavier, y compris la sélection de versets (flèches + Espace) |
| 2.4.7 / 2.4.11 Focus visible et non masqué | Anneau 2 px ; header sticky ne masque pas l'élément focalisé (`scroll-padding-top`) |
| 2.5.7 Mouvements de glisser | Swipe de chapitre doublé de boutons |
| 2.5.8 Taille de cible (24 px) | Nous visons 44 px |
| 3.3.7 Saisie redondante | Les formulaires multi-étapes réutilisent les valeurs déjà saisies |
| 3.3.8 Authentification accessible | Pas de CAPTCHA cognitif ; coller autorisé dans les champs mot de passe et code 2FA |
| 4.1.3 Messages d'état | Toasts et compteurs dans une région `aria-live="polite"` |

## Lecteur biblique
- Structure : `<article lang="fr">` → `<h1>Jean 3</h1>` → un `<p>` par verset, numéro dans `<sup>` accompagné d'un texte
  visuellement masqué « verset 16 ».
- Les titres de péricopes (si présents dans la source) sont des `<h2>`.
- La sélection de versets ne transforme jamais le chapitre : chaque verset reste un paragraphe, que les lecteurs d'écran lisent d'un trait.
  Après hydratation, seul le numéro de verset devient un bouton bascule (`role="button"`, `aria-pressed`), avec un point d'entrée unique au clavier
  (flèches entre les versets, Espace ou Entrée pour sélectionner). Le motif `listbox` a été écarté sur décision du propriétaire (revue E6, 2026-11-05) :
  il faisait lire le chapitre comme une liste de choix. Tests NVDA et TalkBack reportés (backlog R-1).
- Les surlignages ne sont pas signalés uniquement par la couleur : un indicateur (icône ou motif) est disponible et annoncé.

## Langue
`<html lang="fr">` ; les contenus en anglais ou en mooré portent `lang` au niveau du bloc si détectés par l'auteur.

## Tests
- Automatisés : `@axe-core/playwright` sur chaque page des E2E (échec CI si violation `serious` ou `critical`).
- Unitaires : `jest-axe`/équivalent Vitest sur les composants métier ⚠️ choix de la lib à confirmer en Phase 1.
- Manuels à chaque phase : NVDA + Firefox (Windows), TalkBack (Android), clavier seul, zoom 200 %, mode sombre, `prefers-reduced-motion`.
- Agent `accessibility-reviewer` en revue des PR UI.
