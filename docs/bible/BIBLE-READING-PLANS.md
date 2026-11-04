# Plans de lecture

**Phase 6.** Conçu dès maintenant pour que le modèle Bible n'ait pas à changer.

## Types
| Type | Exemple | Durée |
|---|---|---|
| Court | « 7 jours dans les Psaumes de confiance » | 7 j |
| Thématique | « La prière dans la Bible » | 30 j |
| Livre | « Évangile de Marc » | 16 j |
| Trimestriel | « Le Nouveau Testament en 90 jours » | 90 j |
| Annuel | « La Bible en un an » (chronologique ou canonique) | 365 j |

## Modèle
```prisma
model ReadingPlan {
  id String @id @default(cuid(2))
  slug String @unique  title String  description String
  durationDays Int  coverAssetId String?
  status ContentStatus                  // même workflow éditorial que le CMS
  communityId String?                   // plan proposé par une communauté (futur)
}
model ReadingPlanDay {
  planId String  dayNumber Int
  passages Json                         // [{ bookId, chapter, verseStart?, verseEnd? }]
  meditationId String?                  // EditorialContent optionnel
  @@id([planId, dayNumber])
}
model UserReadingPlan {
  id String @id @default(cuid(2))
  userId String  planId String
  startedAt DateTime  pausedAt DateTime?  completedAt DateTime?
  reminderTime String?                  // "06:30" heure locale, facultatif
  @@unique([userId, planId, startedAt])
}
model UserReadingPlanDay { userPlanId String  dayNumber Int  completedAt DateTime  @@id([userPlanId, dayNumber]) }
```

## Règles UX
- Progression par **jour de plan**, pas par date calendaire : un retard n'est pas une « faute ». Message : « Reprends où tu t'es arrêté ».
- Pas de série (« streak ») culpabilisante ; on affiche les jours lus.
- Rappels facultatifs, désactivés par défaut, regroupés avec le verset du jour.
- Cocher un jour = avoir ouvert les passages, ou clic manuel.
- Plan communautaire (futur) : un groupe suit le même plan, avec un fil de discussion par jour.
