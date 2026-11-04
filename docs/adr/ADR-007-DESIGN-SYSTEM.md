# ADR-007 — Design system : tokens, Tailwind 4, shadcn/ui, Inter + Literata

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
Exigence d'un design premium, cohérent entre trois espaces, accessible AA, en clair et sombre, léger sur mobile.

## Décision
- Tokens en **trois niveaux** (primitifs → sémantiques → composants) en variables CSS, mappés dans Tailwind 4 via `@theme inline`.
  Mode sombre par classe `.dark` (préférence système par défaut, choix utilisateur mémorisé).
- **shadcn/ui** (composants copiés, basés sur Radix) pour l'accessibilité et la maîtrise du code ; restylés avec nos tokens.
- **Inter** (UI) + **Literata** (éditorial et lecture biblique), auto-hébergées via `next/font`, licence OFL.
- Palette du brief conservée, avec corrections d'accessibilité **calculées** : `#2C8273` interdit en petit texte (4,24:1),
  ajout de `#256F62` (5,46:1) ; or `#D5AF64` décoratif uniquement sur clair (1,90:1), ajout de `#7A5C22` (5,70:1).
- Animations avec **Motion** (`LazyMotion`), sobres, respectant `prefers-reduced-motion`.

## Alternatives écartées
MUI / Chakra (esthétique générique, poids), Tailwind seul sans primitives (accessibilité à réinventer), polices Google
chargées à distance (vie privée, latence).

## Conséquences
Le design system ([15](../15-DESIGN-SYSTEM.md)) est la référence ; tout nouveau token passe par une PR de design avec
vérification de contraste.
