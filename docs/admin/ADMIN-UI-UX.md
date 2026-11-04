# UI/UX de l'administration

Même identité qu'e-Parole (tokens, typographie, couleurs), **présentation plus dense et fonctionnelle**.
Desktop-first dans la conception, responsive jusqu'à 360 px.

## Shell
```text
┌────────┬──────────────────────────────────────────────────────┐
│ e·P    │ Admin › Utilisateurs › @ruthk     🔍 ⌘K   🔔  (avatar)│
│        ├──────────────────────────────────────────────────────┤
│ ▣ Tab. │ Utilisateurs                         [Exporter]       │
│ 👤 Util│ ┌ Recherche ──────┐ Statut ▾  Rôle ▾  Inscription ▾  │
│ ⚑ Mod. │ └─────────────────┘                                  │
│ 📖 Bib.│ ┌────────────────────────────────────────────────┐   │
│ 👥 Com.│ │ Nom        Statut   Rôles   Inscrit   Activité │   │
│ 📝 Cont│ │ ...                                            │   │
│ 🧾 Aud.│ └────────────────────────────────────────────────┘   │
│ ⚙ Par. │ ‹ 1 2 3 ›                          50 par page ▾     │
│ «      │                                                      │
└────────┴──────────────────────────────────────────────────────┘
```
- **Sidebar** (shadcn `sidebar`) repliable en rail d'icônes (préférence mémorisée), sections masquées selon les
  permissions (confort, pas sécurité). Fond `--brand` (vert profond) avec texte ivoire : marque immédiatement que l'on est en admin.
- **Header** : breadcrumbs, recherche globale ⌘K (utilisateurs, communautés, dossiers par id), notifications admin, menu compte.
- Bandeau discret « Environnement : staging » / « Données de démonstration » quand applicable.

## Composants
KPI cards (valeur, variation, sparkline, lien) · graphiques Recharts · `DataTable` (TanStack : tri, filtres, colonnes
masquables, sélection, pagination serveur, état vide, skeleton de lignes) · formulaires RHF + Zod · `Sheet` latéral pour
l'édition rapide · `AlertDialog` de confirmation avec saisie pour les actions destructives · toasts.

## Densité et lisibilité
Texte de table `text-sm` (14 px), lignes de 44 px, chiffres tabulaires (Inter `tnum`), alignement à droite des nombres.
Badges de statut : couleur **et** libellé (jamais la couleur seule).

## Productivité
Raccourcis : `⌘K` recherche, `G U` utilisateurs, `G M` modération, `J/K` dossier suivant/précédent, `⌘↵` appliquer la
décision, `?` aide. Filtres conservés dans l'URL (partageables entre modérateurs).

## Mobile (< 768 px)
Sidebar en sheet ; tables converties en listes de lignes compactes (2 lignes d'information + chevron) ; actions dans un
menu `⋯` ; la modération reste faisable sur téléphone.

## Mode sombre
Supporté avec les mêmes tokens ; les graphiques utilisent les variantes sombres de la palette.
