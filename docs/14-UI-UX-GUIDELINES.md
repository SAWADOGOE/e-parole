# 14 — Lignes directrices UI/UX

## Intention
e-Parole doit ressembler à **une belle Bible d'étude posée sur une table en bois, à la lumière du matin** :
papier ivoire, encre vert profond, filets dorés discrets, typographie éditoriale. Pas un tableau de bord SaaS,
pas un clone de réseau social.

Trois mots : **recueilli, chaleureux, limpide**.

## Principes
1. **Le texte d'abord.** Le contenu (versets, témoignages, prières) occupe l'espace ; le chrome UI s'efface.
   Pas de cartes autour de chaque publication : séparation par filets et rythme vertical.
2. **Un geste vers la Parole.** L'onglet Bible est toujours visible (barre inférieure sur mobile, sidebar sur desktop).
   Toute référence biblique dans un texte (« Jean 3:16 ») devient un lien qui ouvre un aperçu.
3. **Calme.** Pas de compteurs de vues, pas de points rouges partout, pas de scroll infini sans fin : le fil propose
   « Tu es à jour » après les publications des dernières 48 h.
4. **Respect de la data.** Images en basse résolution par défaut sur réseau lent (`navigator.connection.saveData`),
   chargement à la demande en mode économie.
5. **Bienveillance dans la microcopie.** Erreurs humaines, états vides porteurs de sens.

## Écrans et parcours principaux (mobile)

### Accueil `/`
```text
┌──────────────────────────────┐
│ e·Parole            🔍  🔔   │  header compact, 56 px
├──────────────────────────────┤
│  VERSET DU JOUR   (or, caps) │
│  « Car Dieu a tant aimé le   │  serif 22/32
│   monde… »                   │
│  Jean 3:16 · LSG     Lire ›  │
├──────────────────────────────┤
│  Reprendre : Romains 8   ▸   │  dernier chapitre lu
├──────────────────────────────┤
│ [Abonnements] [Découvrir]    │  onglets segmentés
│ ○ Ruth K. · Témoignage · 2 h │
│ Texte…                       │
│ ┃ Psaume 23:1 — L'Éternel…   │  citation biblique (filet or)
│ 🙏 12   💬 3   ↗             │
├──────────────────────────────┤
│ 🏠  📖  ✚  🙏  👥            │  barre inférieure 64 px
└──────────────────────────────┘
```
Onglets inférieurs : **Accueil · Bible · Publier (✚) · Prières · Communautés**. Profil et paramètres via l'avatar du header.

### Lecteur `/bible/lsg/jean/3`
- Header réduit : « Jean 3 ▾ » (sélecteur livre/chapitre en bottom sheet), « LSG ▾ », « Aa » (réglages).
- Le header se masque au défilement vers le bas, réapparaît vers le haut.
- Tap sur un verset → sélection (fond surligné) + barre d'actions flottante en bas : Copier · Surligner · Note · Favori · Partager.
- Swipe horizontal ou boutons en bas de page pour chapitre précédent/suivant.
- Détails : [bible/BIBLE-READER-UX.md](bible/BIBLE-READER-UX.md).

### Prières `/prieres`
- Filtres en chips : Toutes · Mes communautés · Famille · Études · …
- Chaque demande : catégorie, titre, extrait, « 🙏 Je prie pour toi » (bouton principal, 44 px de haut).
- Après clic : micro-animation (halo doux 400 ms), le bouton devient « Tu pries pour cette demande ✓ ».
- Composer : étape 1 texte, étape 2 visibilité avec explication claire de **qui verra la demande**.

### Communautés `/communautes`
Liste recherchable, « Mes communautés » en premier ; page communauté : bannière, nom, badge vérifié, onglets
Publications · Prières · À propos · Membres.

### Publier (✚)
Bottom sheet plein écran : choix du type (Texte, Verset, Témoignage, Question biblique, Demande de prière → redirige
vers le composer prières), destination (Mon profil / une communauté), images, insertion d'un verset par recherche.

## Desktop (≥ 1024 px)
Trois colonnes : sidebar gauche (240 px, navigation + bouton Publier), contenu central (max 640 px, 720 px pour le
lecteur), colonne contextuelle droite (320 px : verset du jour, plan de lecture, communautés suggérées, aperçu de
référence biblique). Recherche globale `Ctrl/⌘ K`.

## États
| État | Règle | Exemple |
|---|---|---|
| Vide | Illustration linéaire légère + phrase + action | Fil vide : « Suis des frères et sœurs ou rejoins une communauté » + 2 boutons |
| Chargement | Skeleton à la forme du contenu, pas de spinner plein écran | 3 lignes grises pour un verset |
| Erreur réseau | Bandeau persistant « Hors ligne — nous réessayons » ; brouillons conservés | |
| Erreur serveur | Message + identifiant + « Réessayer » | |
| Succès | Toast discret 3 s, annonce `aria-live` | « Publication partagée » |
| Interdit / introuvable | Page sobre, pas de détail technique | |

## Microcopie
- Boutons au verbe : « Publier », « Rejoindre », « Je prie pour toi ».
- Confirmation destructive : nommer la conséquence (« Supprimer définitivement cette demande de prière ? Les 12 personnes qui priaient ne la verront plus. »).
- Pas de jargon technique, pas de majuscules criardes, pas d'emojis dans les messages d'erreur.

## Administration
Voir [admin/ADMIN-UI-UX.md](admin/ADMIN-UI-UX.md) : même identité, densité plus forte, tables, raccourcis clavier.
