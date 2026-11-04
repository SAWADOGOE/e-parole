---
name: eparole-accessibility
description: Use when building or auditing any e-Parole UI for WCAG 2.2 AA - contrast, keyboard navigation, focus, screen reader semantics, the Bible reader verse selection, forms, dialogs, live regions, target sizes, reduced motion.
---

# e-Parole — accessibilité WCAG 2.2 AA

## Instructions
1. Lire `docs/18-ACCESSIBILITY.md`.
2. Couleurs : tokens uniquement. Rappels : `#2C8273` < 4,5:1 sur ivoire (pas de petit texte), or décoratif sur clair.
3. HTML sémantique d'abord (`button`, `nav`, `main`, `h1…h3`, `ul`), ARIA seulement si nécessaire. Primitives shadcn/Radix pour dialogues, menus, onglets.
4. Clavier : tout atteignable, ordre logique, `Échap` ferme, focus rendu à l'élément déclencheur, skip link « Aller au contenu ».
5. Focus visible (`--focus-ring`), non masqué par le header sticky (`scroll-padding-top`).
6. Formulaires : `label` lié, erreurs via `aria-describedby`, `aria-invalid`, résumé d'erreurs focalisé à la soumission.
7. Messages d'état (toasts, « Je prie pour toi » enregistré) dans une région `aria-live="polite"`.
8. Lecteur biblique : un `<p>` par verset, numéro annoncé « verset 16 », sélection au clavier (flèches + Espace),
   surlignages non signalés par la seule couleur.
9. Cibles ≥ 44 px ; gestes doublés d'un bouton ; coller autorisé dans les champs de mot de passe et de code.
10. `prefers-reduced-motion` : pas de translation ni d'échelle.
11. `lang="fr"` ; `lang` spécifique sur les blocs dans une autre langue.

## Vérifications
- [ ] axe : 0 violation `serious`/`critical`
- [ ] Parcours au clavier seul
- [ ] Zoom 200 % sans perte, 320 px sans scroll horizontal
- [ ] Test lecteur d'écran (NVDA ou TalkBack) pour les composants nouveaux complexes

## Références
`docs/18-ACCESSIBILITY.md`, `docs/15-DESIGN-SYSTEM.md#états-interactifs`.
