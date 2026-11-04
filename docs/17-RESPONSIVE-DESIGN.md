# 17 — Responsive design

## Stratégie
- Espace communautaire `/` : **mobile-first**. Les styles de base ciblent 360 px ; `md:` et `lg:` enrichissent.
- Administration `/admin` : **desktop-first dans la conception**, mais implémentée en mobile-first CSS avec des tableaux
  qui basculent en listes empilées sous `md`.
- `/manage` : utilisable sur mobile (les responsables d'église sont souvent sur téléphone).

## Appareils de référence
| Profil | Viewport | Contraintes |
|---|---|---|
| Android entrée de gamme | 360 × 740, DPR 2 | CPU lent, 2 Go RAM, Chrome |
| Petit écran | 320 × 640 | Pas de débordement horizontal |
| iPhone | 390 × 844 | Safe areas (`env(safe-area-inset-bottom)`) |
| Tablette | 768 × 1024 | Deux colonnes |
| Desktop | 1280 × 800 et 1440 × 900 | Trois colonnes |

## Disposition par breakpoint
| Zone | < 768 | 768–1023 | ≥ 1024 |
|---|---|---|---|
| Navigation | Barre inférieure 5 onglets | Rail latéral icônes 72 px | Sidebar 240 px avec labels |
| Contenu | Pleine largeur, gouttière 16 | Max 640, centré | Max 640 (fil) / 720 (lecteur) |
| Colonne contextuelle | Absente (contenu déplacé dans les pages) | Absente | 320 px |
| Composer | Sheet plein écran | Dialog | Dialog |
| Sélecteur de livre | Bottom sheet | Popover | Popover large en grille |
| Admin tables | Liste de cartes compactes | Table avec colonnes réduites | Table complète |

## Règles
- Unités : `rem` pour la typographie, `dvh` pour les hauteurs plein écran (barre d'adresse mobile).
- Images : `next/image` avec `sizes` exacts ; AVIF puis WebP ; largeurs générées 320, 640, 960, 1280.
- Aucune interaction uniquement au survol. Les actions de `PostItem` sont visibles sans hover.
- Gestes (swipe chapitre) doublés d'un bouton.
- Clavier virtuel : le composer reste utilisable (barre d'outils au-dessus du clavier, `visualViewport`).
- Orientation paysage supportée pour le lecteur.
- Test visuel Playwright aux 4 viewports de référence pour les écrans critiques.
