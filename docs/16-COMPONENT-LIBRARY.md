# 16 — Bibliothèque de composants

Base : **shadcn/ui** (copiés dans `src/components/ui`, thémés par nos tokens). Les composants métier vivent dans
`src/components/shared` (transverses) ou `src/features/<module>/components` (spécifiques).

## Primitives shadcn retenues
`button`, `input`, `textarea`, `label`, `form` (RHF), `select`, `checkbox`, `radio-group`, `switch`, `dialog`,
`alert-dialog`, `sheet`, `drawer` (bottom sheet mobile), `dropdown-menu`, `popover`, `tooltip`, `tabs`, `toggle-group`,
`avatar`, `badge`, `skeleton`, `sonner` (toasts), `command` (recherche ⌘K), `scroll-area`, `separator`,
`table` + `data-table` (TanStack), `chart` (Recharts), `breadcrumb`, `sidebar`, `pagination`, `calendar`.

Non retenus : `carousel` (lourd ; galerie maison simple), `resizable`, `menubar`.

## Composants métier

| Composant | Module | Description | Points clés |
|---|---|---|---|
| `AppShell` | layout | Header + `BottomNav` (mobile) / `SideNav` (desktop) + colonne contextuelle | Skip link « Aller au contenu » |
| `BottomNav` | layout | 5 onglets, item actif en `--brand` | `aria-current="page"`, safe-area iOS |
| `AdminShell` | layout | Sidebar repliable, breadcrumbs, recherche, notifications | Voir [admin/ADMIN-UI-UX.md](admin/ADMIN-UI-UX.md) |
| `VerseText` | bible | Rendu d'un chapitre, versets sélectionnables | `<p>` par verset, numéros `aria-hidden` + texte accessible |
| `VerseQuote` | bible | Citation dans un post/prière/message | Filet or, référence cliquable, mention de la traduction **toujours** affichée |
| `ReferenceInput` | bible | Champ « Aller à… » avec parsing en direct | Suggestions de livres (trigrammes) |
| `ReferenceLink` | bible | Détection auto « Jean 3:16 » dans un texte → popover d'aperçu | Ne pas détecter dans le code ou les URL |
| `VerseActionBar` | bible | Copier, surligner, note, favori, partager | Clavier : `C`, `H`, `N`, `B`, `S` |
| `ReaderSettings` | bible | Taille, interligne, thème, police | Persisté (DB si connecté, localStorage sinon) |
| `DailyVerseCard` | bible | Verset du jour | Pas une « card » à ombre : bloc éditorial |
| `PostItem` | social | Publication dans le fil | Pas de carte ; filet séparateur |
| `PostComposer` | social | Rédaction, types, images, verset | Brouillon auto-sauvé, upload progressif |
| `ReactionBar` | social | Amen / J'aime / Encouragé | Une réaction, `aria-pressed` |
| `CommentThread` | social | Commentaires + 1 niveau de réponse | |
| `PrayerItem` | prayers | Demande de prière | Badge visibilité explicite (🔒 Communauté X) |
| `PrayButton` | prayers | « Je prie pour toi » | Optimiste, idempotent, halo |
| `VisibilityPicker` | shared | Choix de visibilité avec explication de l'audience | Radio group, phrase « Visible par : … » |
| `CommunityHeader` | communities | Bannière, nom, badges, rejoindre | |
| `EmptyState` | shared | Illustration + texte + action | Variantes par module |
| `ErrorState` | shared | Erreur + identifiant + réessayer | |
| `ConfirmDialog` | shared | Confirmation destructive, saisie de confirmation optionnelle | Focus sur « Annuler » par défaut |
| `ReportDialog` | moderation | Motif, détails, envoi | Accessible partout via menu `⋯` |
| `KpiCard`, `TrendChart`, `DataTable` | administration | Admin | Données réelles ou état vide |

## Règles
- Pas de composant > 200 lignes : extraire des sous-composants.
- Les composants UI ne font aucun appel réseau ; les données arrivent par props ou via des Server Components parents.
- Chaque composant métier a une story de test (RTL) couvrant : rendu, états vide/erreur, accessibilité de base.
- Storybook : ⚠️ non retenu au MVP (coût de maintenance) ; une page `/dev/ui` (dev uniquement) affiche les variantes.
