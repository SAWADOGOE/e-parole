# Comparaison des API bibliques

Vérifications effectuées le **2026-11-04** : pages de documentation consultées et appels réels aux endpoints de liste
de traductions lorsque possible. Ce qui n'a pas pu être vérifié est indiqué ❓.

## Synthèse

| Critère | Midvash | HelloAO (Free Use Bible API) | getBible | API.Bible |
|---|---|---|---|---|
| URL | `https://api.midvash.com/v1/…` | `https://bible.helloao.org/api/…` | `https://api.getbible.net/v2/…` | `https://api.scripture.api.bible/v1/…` ❓ (non revérifié) |
| Auth | Aucune | Aucune | Aucune pour la lecture ❓ (page « Access & tokens » non lue) | Clé API obligatoire |
| Gratuité | Gratuit | Gratuit (dons) | Gratuit (dons) | Plan Starter gratuit, payant au-delà |
| Quotas | Aucun annoncé ; demande d'utiliser ETag et le batch | Aucun annoncé | ❓ non documenté sur la page | 5 000 req/mois (Starter) à 150 000 (Pro) |
| LSG 1910 | `lsg`, annoncée **domaine public** | `fra_lsg`, **domaine public** (source eBible.org) | `ls1910`, métadonnée « Copyrighted; Permission to distribute granted to CrossWire » | ❓ catalogue non vérifié |
| Darby | `darby-fr`, domaine public | `fra_jnd`, domaine public | `darby`, domaine public | ❓ |
| Autres FR | Crampon, Martin 1744, Néo-Crampon Libre (CC BY-SA), Bible libre… | Néo-Crampon Libre (CC BY-SA, attribution), Ostervald | Martin 1744 | ❓ |
| Stockage local | Non traité explicitement ; contenus annoncés immuables, cache HTTP 1 an | Explicitement autorisé (copie et stockage, téléchargements) | ❓ | Restreint (FUMS, conditions de cache à demander au support) |
| Commercial | Selon licence de chaque version | Selon licence ; LSG/Darby : `commercialUse: allowed` | ❓ | Starter : non commercial |
| Format | JSON `{ data, meta }`, erreurs codées, `didYouMean` | JSON statique, USFM disponible, notes de bas de page | JSON v2/v3 | JSON, contenu USX |
| Particularités | Parsing de références `/v1/parse`, batch 50 passages, verset du jour `/v1/votd`, CORS ouvert | Fichiers statiques, téléchargement en masse, SDK | Projet open source, MCP disponible | Large catalogue sous droits, traçage FUMS obligatoire |
| Fiabilité | ❓ projet récent, opérateur à identifier | ❓ maintenu par AO Lab ; données issues d'eBible.org | ❓ projet communautaire ancien | Opéré par American Bible Society |

## Analyse

### Midvash
Bonne ergonomie (parsing de références, batch, verset du jour), sans clé. Mais : opérateur et pérennité non établis,
aucun SLA, conditions de stockage non écrites. **Usage retenu** : fournisseur secondaire possible pour vérifier un import ;
son parseur peut servir de référence de comportement pour le nôtre. Pas de dépendance runtime.

### HelloAO — Free Use Bible API
Seule API vérifiée qui **autorise explicitement le stockage local** ; ses métadonnées de licence sont structurées
(`publicDomain`, `commercialUse`, `attribution`). Ses données LSG proviennent d'eBible.org. **Usage retenu** : fournisseur
d'import secondaire et contrôle croisé.

### getBible
Fonctionnel mais la métadonnée de licence de `ls1910` (« Copyrighted; Permission to distribute granted to CrossWire »)
**contredit** les autres sources qui la déclarent domaine public. Il s'agit vraisemblablement d'une métadonnée héritée
du module CrossWire/SWORD, mais cette incohérence suffit pour **ne pas l'utiliser comme source** de référence.

### API.Bible
Pertinente uniquement pour d'éventuelles traductions modernes sous droits (Phase 6+) ; impose une clé, des quotas, le
traçage FUMS (envoi d'événements de lecture à un tiers, impact confidentialité) et des restrictions de cache.
**Non retenue** au MVP.

## Source primaire retenue : eBible.org
Les fichiers `fraLSG` (Louis Segond 1910) et `frajnd` (Darby) d'eBible.org, en USFX/USFM, sont la **source primaire
d'import**. eBible.org publie la licence de chaque traduction ; ⚠️ la page `https://ebible.org/Scriptures/details.php?id=fraLSG`
doit être relue et archivée (capture datée) avant l'import en Phase 2.

## À vérifier en Phase 2
- Lecture intégrale des conditions d'utilisation de Midvash et HelloAO (pages dédiées non consultées).
- Versification LSG d'eBible.org comparée à HelloAO et Midvash (Psaumes, Malachie 4, Romains 16:25-27…).
- Catalogue français d'API.Bible et conditions de cache (si une traduction moderne est envisagée).
