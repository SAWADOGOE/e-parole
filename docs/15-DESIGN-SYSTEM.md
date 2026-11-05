# 15 — Design system

Architecture des tokens : **primitifs → sémantiques → composants**, exposés en variables CSS et mappés
dans Tailwind 4 via `@theme inline` ([ADR-007](adr/ADR-007-DESIGN-SYSTEM.md)).

## Couleurs

### Palette proposée et ajustements
Les contrastes ont été **calculés** (formule WCAG 2.x, luminance relative) pendant la Phase 0 :

| Couleur du brief | Hex | Contraste sur ivoire `#F7F5EF` | Verdict |
|---|---|---|---|
| Vert profond | `#103B39` | 11,29:1 | ✅ texte, surfaces de marque |
| Vert secondaire | `#2C8273` | **4,24:1** | ⚠️ insuffisant pour du texte < 24 px. Réservé aux icônes, grands titres, fonds de bouton (texte blanc : 4,62:1 ✅) |
| Or doux | `#D5AF64` | **1,90:1** | ❌ jamais pour du texte sur clair. Décoratif (filets, icônes avec label) ou texte sur vert profond (5,94:1 ✅) |
| Anthracite | `#202B30` | 13,29:1 | ✅ texte courant |
| Ivoire | `#F7F5EF` | — | Fond principal |

Ajouts justifiés : `green-600 #256F62` (5,46:1) pour liens et texte d'accent ; `gold-700 #7A5C22` (5,70:1) pour
texte doré sur clair ; neutres teintés de vert pour éviter un gris froid.

### Primitifs
```css
:root {
  /* Vert e-Parole */
  --green-50:  #EEF6F4;  --green-100: #D5EAE5;  --green-200: #A9D3CA;
  --green-300: #78B9AB;  --green-400: #5FB8A6;  --green-500: #2C8273;
  --green-600: #256F62;  --green-700: #1B5650;  --green-800: #154844;  --green-900: #103B39;  --green-950: #0A2624;
  /* Or */
  --gold-100: #F6EBD3;  --gold-300: #E5C88C;  --gold-400: #D5AF64;  --gold-600: #9C7A34;  --gold-700: #7A5C22;
  /* Neutres chauds */
  --ivory-50: #FBFAF6;  --ivory-100: #F7F5EF;  --ivory-200: #ECE8DD;  --ivory-300: #DDD7C8;
  --ink-400: #9AA6AA;  --ink-500: #6B777C;  --ink-600: #5E6B70;  --ink-700: #4F5B60;  --ink-800: #2E3A3F;  --ink-900: #202B30;  --ink-950: #121A1D;
  /* Statuts */
  --red-600: #B42318;  --red-400: #F97066;  --amber-600: #B54708;  --amber-400: #FDB022;  --blue-600: #1D5FA8;  --blue-400: #6AA8F0;
}
```

### Sémantiques (clair / sombre)
| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `ivory-100` | `ink-950` | Fond d'application |
| `--bg-elevated` | `ivory-50` | `#18232A` | Feuilles, menus, sheets |
| `--bg-subtle` | `ivory-200` | `#1F2C33` | Zones secondaires, skeleton |
| `--fg` | `ink-900` | `ivory-200` | Texte courant (14,4:1 en sombre) |
| `--fg-muted` | `ink-600` | `ink-400` | Métadonnées (5,05:1 / 7,06:1) |
| `--border` | `ivory-300` | `#2A3840` | Filets |
| `--brand` | `green-900` | `green-400` | Marque, header actif |
| `--accent` | `green-600` | `green-400` | Liens, focus, éléments actifs |
| `--accent-fg-on` | `#FFFFFF` | `ink-950` | Texte sur `--accent` (7,47:1 en sombre) |
| `--primary-bg` | `green-500` | `green-400` | Bouton principal |
| `--gold` | `gold-400` | `gold-400` | Filets, verset du jour (décoratif) |
| `--gold-fg` | `gold-700` | `gold-400` | Texte doré (5,70:1 / 8,52:1) |
| `--danger` | `red-600` | `red-400` | Erreurs (6,03:1 / 6,33:1) |
| `--focus-ring` | `green-600` | `gold-400` | Anneau de focus 2 px + offset 2 px |
| `--highlight-yellow/green/blue/pink/purple` | pastels 30 % | pastels sombres | Surlignages bibliques |

Mode lecture « Sépia » supplémentaire pour le lecteur : fond `#F3EAD8`, texte `#3B2F22`. Tokens dédiés dans `globals.css` (section 6).

Contrastes du lecteur, calculés en Phase 2 (formule WCAG 2.x) :

| Paire | Clair | Sombre | Sépia |
|---|---|---|---|
| Texte / fond | 13,29 | 14,40 | 10,88 |
| Texte secondaire / fond | 5,05 | 7,06 | 6,01 |
| Lien / fond | 5,46 | 7,47 | 6,22 |
| Numéro de verset / fond | 5,70 | 8,52 | 6,37 |
| Numéro de verset / sélection | 4,95 | 5,94 | 5,80 |
| Texte / sélection | 11,54 | 10,05 | 9,91 |
| Texte / surlignage (le plus faible des 5) | 10,56 | 7,08 | 8,73 |

Un surlignage n'est jamais signalé par la seule couleur : chaque teinte a un trait distinct (plein, tirets, pointillés, double, ondulé) et un texte annoncé.

Dans Tailwind 4 :
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@theme inline {
  --color-bg: var(--bg);  --color-fg: var(--fg);  --color-muted: var(--fg-muted);
  --color-accent: var(--accent);  --color-brand: var(--brand);  --color-gold: var(--gold);
  --font-sans: var(--font-inter);  --font-serif: var(--font-literata);
}
```

## Typographie
| Rôle | Police | Raison |
|---|---|---|
| Interface | **Inter** (variable, via `next/font`, sous-ensemble latin + latin-ext) | Excellente lisibilité sur petits écrans bas de gamme, chiffres tabulaires pour l'admin |
| Éditorial et lecture biblique | **Literata** (variable) | Conçue pour la lecture longue sur écran (Google Play Livres), accents français soignés, caractère chaleureux |
| Alternative envisagée | Source Serif 4 | Si Literata pèse trop (à mesurer) |

Les deux sont sous licence SIL OFL et servies localement (pas d'appel à Google Fonts au runtime).

Échelle (rem, base 16 px, ratio ~1,2) :
| Token | Taille / interligne | Usage |
|---|---|---|
| `text-xs` | 12/16 | Badges |
| `text-sm` | 14/20 | Métadonnées, admin dense |
| `text-base` | 16/24 | UI courante |
| `text-lg` | 18/28 | Corps de publication |
| `reading-md` | 19/32 serif | Lecteur biblique par défaut (ajustable 16 → 28) |
| `text-xl` | 20/28 | Titres de section |
| `display-sm` | 24/32 serif | Verset du jour |
| `display-md` | 30/38 serif | Titres de page |
| `display-lg` | 40/48 serif | Accueil visiteurs |

Numéros de versets : Inter 11 px, `--gold-fg`, en exposant non sélectionnable (`user-select: none`), lus par les lecteurs d'écran.

## Espacements, grille, breakpoints
- Échelle 4 px : 0, 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64).
- Gouttières : 16 px mobile, 24 px tablette, 32 px desktop.
- Breakpoints Tailwind par défaut : `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Cible minimale **360 px** (et test à 320 px).
- Mesure de lecture : 60 à 70 caractères (`max-w-[38rem]` pour le lecteur).

## Rayons, ombres, bordures
- Rayons : `sm 6px` (inputs), `md 10px` (boutons, menus), `lg 16px` (sheets, médias), `full` (avatars, chips).
- Ombres : **deux niveaux seulement** — `shadow-sm` (menus) `0 1px 2px rgb(16 59 57 / .06), 0 2px 8px rgb(16 59 57 / .06)` ;
  `shadow-lg` (dialogs, sheets) `0 12px 32px rgb(16 59 57 / .14)`. En sombre, élévation par la couleur de fond plutôt que l'ombre.
- Filets : 1 px `--border`. Citation biblique : filet gauche 3 px `--gold`.

## Iconographie
lucide-react, trait 1,75, taille 20 (UI) / 24 (barre inférieure). Toujours avec label texte ou `aria-label`.
Icônes métier personnalisées (SVG maison, même grille 24) : Bible ouverte, mains en prière, croix sobre, colombe ⚠️ à valider.

## Logo et iconographie
Proposition : monogramme **livre ouvert dont la tranche centrale forme une croix**, un rayon de lumière doré au-dessus.
Wordmark « e·Parole » en Literata semi-bold, point médian doré. Variantes : couleur sur ivoire, ivoire sur vert profond,
monochrome. ⚠️ À confier à un designer ; un placeholder SVG sera créé en Phase 1.

## Motion
| Token | Durée | Courbe | Usage |
|---|---|---|---|
| `motion-fast` | 120 ms | `ease-out` | Hover, press |
| `motion-base` | 200 ms | `cubic-bezier(.2,.8,.2,1)` | Menus, toasts |
| `motion-slow` | 320 ms | idem | Sheets, transitions de page |
| `motion-prayer` | 400 ms | spring doux | Halo « Je prie pour toi » |

`prefers-reduced-motion: reduce` → transitions d'opacité uniquement, aucune translation. Pas d'animation en boucle.

## États interactifs
| État | Traitement |
|---|---|
| Hover (pointeur fin uniquement) | Fond `--bg-subtle` ou assombrissement 6 % |
| Pressed | Échelle 0,98 + assombrissement 10 % |
| Focus visible | Anneau `--focus-ring` 2 px + offset 2 px, jamais supprimé |
| Désactivé | Opacité 50 %, `cursor-not-allowed`, raison en tooltip si possible |
| Sélectionné (verset) | Fond `--green-100` / sombre `#1B3A37`, filet gauche `--accent` |
| Erreur | Bordure `--danger`, message sous le champ lié par `aria-describedby` |

Cibles tactiles : **44 × 44 px minimum** (au-delà du minimum 24 px de WCAG 2.2 AA).
