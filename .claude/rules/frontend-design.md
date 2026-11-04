---
paths:
  - "src/components/**"
  - "src/features/**/components/**"
  - "src/app/**/*.tsx"
  - "src/styles/**"
---

# Design frontend

- Couleurs : tokens sémantiques uniquement (`bg-bg`, `text-fg`, `text-muted`, `text-accent`…), aucun hex dans les composants.
- `#2C8273` jamais en texte < 24 px sur fond clair ; or `#D5AF64` décoratif sur fond clair ; texte doré = `--gold-fg`.
- Inter pour l'UI, Literata (`font-serif`) pour versets et contenus éditoriaux.
- Filets et rythme vertical plutôt que cartes ; deux niveaux d'ombre maximum ; pas de gradients décoratifs généralisés.
- Toute citation biblique via `VerseQuote` (référence + traduction visibles).
- Chaque vue : état vide, skeleton, erreur, succès.
- Microcopie FR via next-intl, verbe d'action, ton fraternel ; aucune promesse de guérison/résultat.
- Iconographie : lucide-react trait 1,75 ; jamais de symboles catholiques comme identité (chapelet, Marie, saints).
- Animations Motion ≤ 320 ms, `prefers-reduced-motion` respecté.
- Composants ≤ 200 lignes ; aucun appel réseau dans les composants UI.
