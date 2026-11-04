---
name: eparole-frontend-design
description: Use when designing or building any screen or component of the e-Parole member space (feed, Bible reader, prayers, communities, profile, onboarding, empty states). Applies the e-Parole visual identity, design tokens and evangelical visual guidelines instead of generic dashboard styling.
---

# e-Parole — design de l'espace membre

## Quand l'utiliser
Toute UI sous `src/app/(community)`, `(public)`, `(auth)` et les composants de `src/components/shared` ou `src/features/*/components`.
Pour `/admin`, utiliser aussi `eparole-admin`.

## Intention
« Une belle Bible d'étude posée sur une table, à la lumière du matin » : ivoire, encre vert profond, filets dorés,
serif éditoriale pour le contenu. Recueilli, chaleureux, limpide.

## Instructions
1. Lire `docs/14-UI-UX-GUIDELINES.md` (écrans, microcopie) et `docs/15-DESIGN-SYSTEM.md` (tokens).
2. Utiliser **uniquement** les tokens sémantiques (`bg-bg`, `text-fg`, `text-muted`, `text-accent`, `border-border`…),
   jamais de couleur hexadécimale dans un composant.
3. Typographie : Inter pour l'UI ; Literata (`font-serif`) pour versets, titres éditoriaux, témoignages longs.
4. Composer avec des **filets et du rythme vertical**, pas des cartes à ombre. Deux ombres maximum (`shadow-sm`, `shadow-lg`).
5. Toute citation biblique passe par `VerseQuote` (filet or, référence, traduction).
6. Prévoir systématiquement : état vide (illustration linéaire + phrase + action), skeleton, erreur, succès (toast + `aria-live`).
7. Microcopie : verbes d'action, ton fraternel, tutoiement côté membre, aucune promesse de guérison ou de résultat.
8. Mobile d'abord (360 px), puis `md:` / `lg:` (voir `eparole-responsive-design`).
9. Animations Motion sobres (≤ 320 ms), respect de `prefers-reduced-motion`.

## Contraintes d'identité
- Iconographie : Bible, lumière, croix sobre, mains jointes, communauté. **Jamais** chapelet, Marie, saints, vitraux.
- Or `#D5AF64` : décoratif seulement sur fond clair. Texte doré → `--gold-fg`.
- `#2C8273` : pas de texte < 24 px sur ivoire ; liens et petit texte d'accent → `--accent` (`#256F62`).
- Pas de compteurs anxiogènes, pas de badges rouges multiples, pas de gradients décoratifs généralisés.

## Vérifications
- [ ] Captures 360 px et 1280 px, clair et sombre
- [ ] États vide / chargement / erreur présents
- [ ] Contrastes AA (aucune couleur hors tokens)
- [ ] Cibles tactiles ≥ 44 px, focus visible
- [ ] Aucun texte en dur hors fichiers de messages next-intl

## Références
`docs/14-UI-UX-GUIDELINES.md`, `docs/15-DESIGN-SYSTEM.md`, `docs/16-COMPONENT-LIBRARY.md`, `docs/03-EVANGELICAL-IDENTITY.md`.
Le plugin `frontend-design` et le skill utilisateur `ui-ux-pro-max` peuvent compléter, sans contredire ces tokens.
