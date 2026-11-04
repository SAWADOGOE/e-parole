# Lecteur biblique — UX

## Objectif
Une lecture **aussi confortable qu'un livre** : texte serif, marges généreuses, aucun élément parasite, et des outils
qui n'apparaissent que lorsqu'on les demande.

## URL
`/bible` → redirige vers le dernier chapitre lu (ou Jean 1 pour un nouveau lecteur).
`/bible/lsg/jean/3` (slug français du livre) · `/bible/lsg/jean/3#v16` · `/bible/recherche?q=grâce`.
Les slugs sont résolus via `BibleBookName` ; `/bible/lsg/JHN/3` redirige vers la forme canonique.

## Mobile — structure
```text
┌──────────────────────────────┐
│ ‹  Jean 3 ▾      LSG ▾   Aa  │  se masque au scroll ↓
├──────────────────────────────┤
│                              │
│  Jean 3                      │  display-md serif
│                              │
│ ¹ Mais il y eut un homme     │  reading-md 19/32 serif
│ d'entre les pharisiens,      │  mesure ~38 rem max
│ nommé Nicodème…              │
│ ¹⁶ Car Dieu a tant aimé le   │  ← verset sélectionné : fond vert pâle,
│ monde qu'il a donné son Fils │    filet gauche accent
│ unique…                      │
│                              │
│  Louis Segond 1910 · domaine │  attribution, text-sm muted
│  public                      │
│  ‹ Jean 2        Jean 4 ›    │  navigation de fin de chapitre
├──────────────────────────────┤
│ 📋 Copier 🖍 Surligner 📝 Note │  barre d'actions, visible si sélection
│ 🔖 Favori  ↗ Partager         │
└──────────────────────────────┘
```

## Interactions
| Action | Mobile | Desktop / clavier |
|---|---|---|
| Sélectionner un verset | Tap | Clic ; flèches ↑↓ pour se déplacer, Espace pour (dé)sélectionner |
| Étendre la sélection | Tap sur d'autres versets (contigus ou non) | Maj + clic / Maj + flèches |
| Effacer la sélection | Tap hors texte, bouton ✕ | Échap |
| Chapitre suivant / précédent | Swipe ou boutons de fin | `→` / `←` (hors champ de saisie) |
| Changer de livre/chapitre | Bottom sheet : grille des livres (AT/NT), puis grille des chapitres | Popover, saisie directe |
| Aller à une référence | Champ en tête du sheet | `G` ou `Ctrl/⌘ K` |
| Mode focus | Icône plein écran | `F` |

Copier produit : `« Car Dieu a tant aimé le monde… » — Jean 3:16 (Louis Segond 1910)`.
Partager : feuille avec « Publier », « Envoyer à une communauté », « Copier le lien », et partage natif (`navigator.share`).
Une image de verset (carte légère générée côté serveur, < 80 Ko) est prévue en Phase 3 pour WhatsApp.

## Réglages « Aa »
| Réglage | Valeurs | Défaut |
|---|---|---|
| Taille du texte | 16 à 28 px, pas de 2 | 19 |
| Interligne | Compact 1,5 · Normal 1,7 · Aéré 1,9 | 1,7 |
| Thème | Système · Clair · Sépia · Sombre | Système |
| Police | Serif (Literata) · Sans (Inter) | Serif |
| Numéros de versets | Affichés · Masqués | Affichés |

Persistance : `BibleReadingState` si connecté ; `localStorage` sinon (avec `try/catch`).

## États
- Chargement de chapitre (navigation client) : skeleton de 12 lignes de largeurs variables.
- Hors ligne : chapitres déjà visités servis par le cache du navigateur (Phase 7) ; sinon message « Ce chapitre n'est pas
  encore disponible hors ligne ».
- Référence invalide : message correctif (« Jean compte 21 chapitres. Aller à Jean 21 ? »).

## Desktop
Lecteur centré 720 px ; colonne contextuelle droite : notes du chapitre, références croisées (futur), méditation liée.
Comparaison de traductions (Phase 6) : deux colonnes synchronisées verset par verset.

## Accessibilité
Voir [18-ACCESSIBILITY.md](../18-ACCESSIBILITY.md#lecteur-biblique).
