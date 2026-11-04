---
paths:
  - "src/components/**"
  - "src/features/**/components/**"
  - "src/app/**/*.tsx"
---

# Responsive

- Mobile-first : styles de base à 360 px, enrichis par `md:` (768) et `lg:` (1024). Aucun scroll horizontal à 320 px.
- Membre : `BottomNav` < 768, rail 768–1023, sidebar + colonne contextuelle ≥ 1024.
- Sélecteurs/composer : `Drawer` sur mobile, `Popover`/`Dialog` dès `md`.
- `dvh` pour le plein écran, `env(safe-area-inset-bottom)` sous la barre inférieure.
- Aucune action uniquement au survol ; tout geste doublé d'un bouton ; cibles ≥ 44 px.
- `next/image` avec `sizes` exacts.
- Admin : table ≥ `lg`, liste compacte sous `md`.
