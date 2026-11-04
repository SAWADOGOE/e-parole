# ADR-005 — Temps réel : différé, SSE puis WebSocket

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
La messagerie, la présence et les notifications instantanées sont souhaitées, mais la messagerie est hors MVP.
Next.js (Route Handlers) ne gère pas nativement des WebSocket durables ; les réseaux mobiles visés coupent souvent les
connexions longues.

## Options
| Option | Avantages | Inconvénients |
|---|---|---|
| Polling (30-60 s) | Trivial, robuste sur réseau instable | Latence, requêtes inutiles |
| **SSE** depuis un Route Handler + PostgreSQL `LISTEN/NOTIFY` | Simple, unidirectionnel suffisant pour un compteur, passe les proxies | Une connexion par onglet ; nécessite un runtime Node persistant (OK en Docker) |
| Serveur WebSocket dédié (Socket.IO 4.8 ou `ws`) dans le même repo | Bidirectionnel, présence, salons | Processus en plus, Redis requis en multi-instance |
| Fournisseur managé (Pusher, Ably, Soketi auto-hébergé) | Pas d'infra | Coût, données transitant par un tiers (messages privés) |

## Décision
- **MVP** : notifications in-app par **SSE** (`/api/notifications/stream`) avec repli automatique en polling 60 s ;
  événements émis via `LISTEN/NOTIFY`. Pas de présence.
- **Phase 7 (messagerie)** : processus `realtime` dédié (WebSocket, Socket.IO ou `ws` — choix final à ce moment),
  authentifié par le cookie de session, + Redis pour la diffusion multi-instance. Les messages restent persistés en
  PostgreSQL ; le temps réel n'est qu'un canal de livraison.
- Pas de fournisseur tiers pour les messages privés (confidentialité).

## Conséquences
Le modèle de données de messagerie et les notifications sont conçus pour fonctionner sans temps réel (pagination,
« non lus »), le temps réel étant une amélioration.
