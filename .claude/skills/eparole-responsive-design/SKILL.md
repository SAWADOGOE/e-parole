---
name: eparole-responsive-design
description: Use when laying out an e-Parole page or component across mobile, tablet and desktop, handling the bottom navigation, the three-column desktop shell, bottom sheets vs popovers, safe areas, virtual keyboard or responsive admin tables.
---

# e-Parole — responsive

## Quand l'utiliser
Mise en page d'un écran, navigation, composer, sélecteurs, tables admin.

## Instructions
1. Styles de base = 360 px. Enrichir avec `md:` (768) et `lg:` (1024). Tester aussi 320 px (aucun scroll horizontal).
2. Navigation membre : `BottomNav` (< 768) → rail 72 px (768–1023) → sidebar 240 px + colonne contextuelle 320 px (≥ 1024).
3. Sélecteurs et composer : `Drawer` (bottom sheet) sur mobile, `Popover`/`Dialog` à partir de `md`.
4. Hauteurs plein écran en `dvh` ; `env(safe-area-inset-bottom)` sous la barre inférieure.
5. Aucune action accessible uniquement au survol ; tout geste (swipe) doublé d'un bouton.
6. Images : `next/image` avec `sizes` exacts (ex. `(min-width: 1024px) 640px, 100vw`).
7. Admin : table complète ≥ `lg`, colonnes réduites en `md`, liste de lignes compactes sous `md`.
8. Lecteur biblique : mesure max ~38 rem, gouttières 16/24/32 px.

## Vérifications
- [ ] 320, 360, 390, 768, 1280, 1440 px vérifiés (Playwright `setViewportSize`)
- [ ] Clavier virtuel ne masque pas le champ actif
- [ ] Paysage OK pour le lecteur

## Références
`docs/17-RESPONSIVE-DESIGN.md`, `docs/14-UI-UX-GUIDELINES.md#desktop--1024-px`.
