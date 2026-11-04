---
paths:
  - "src/components/**"
  - "src/features/**/components/**"
  - "src/app/**/*.tsx"
---

# Accessibilité (WCAG 2.2 AA)

- HTML sémantique, primitives Radix/shadcn pour dialogues, menus, onglets.
- Tout utilisable au clavier ; focus visible et non masqué ; focus rendu au déclencheur ; skip link.
- Nom accessible pour chaque contrôle ; icônes seules avec `aria-label`.
- Formulaires : `label` lié, `aria-invalid`, `aria-describedby` pour les erreurs.
- Messages d'état en `aria-live="polite"`.
- Contraste via tokens validés ; aucune information par la couleur seule (surlignages, statuts).
- Cibles ≥ 44 px ; gestes doublés d'un bouton ; coller autorisé dans mots de passe et codes.
- `prefers-reduced-motion` respecté ; `lang="fr"` et `lang` spécifique par bloc.
- Lecteur biblique : un `<p>` par verset, numéro annoncé, sélection clavier.
- axe : 0 violation `serious`/`critical`.
