# IMPLEMENTATION_PLAN.md
## HexRealm
### Plan de développement du MVP en ligne

## 1. Objectif

Construire une application web en ligne permettant de gérer une campagne narrative Warhammer Age of Sigmar : comptes, campagnes 2 à 6 joueurs, cartes dynamiques, lobby, ordres secrets, révélation, conquêtes, batailles, résultats, Gloire et tours ouverts.

## 2. Stack technique

Frontend : Next.js, React, TypeScript, Tailwind CSS.

Backend/données : Supabase Auth, Supabase PostgreSQL, Row Level Security. Realtime optionnel après MVP.

Hébergement : Vercel + Supabase Cloud.

## 3. Documents de référence

- `docs/PRODUCT_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/CODEX_INSTRUCTIONS.md`
- `docs/JOURNAL_DEVELOPPEMENT.md`
- `docs/UI_WIREFRAMES.md`
- `docs/MAP_DESIGN.md`

Priorité : CODEX_INSTRUCTIONS, IMPLEMENTATION_PLAN, DATA_MODEL, PRODUCT_SPEC, UI_WIREFRAMES, MAP_DESIGN.

## 4. Principes

Avancer par lots. Chaque lot doit être limité, testable et compilable. Garder le MVP strict. Séparer logique métier et interface dans `/lib`.

État au 2026-06-01 : les lots 1 à 20 sont implémentés. Le Lot 21 est commencé avec la fusion campagne/carte/ordres dans un écran central, l'annulation des ordres soumis et la simplification des actions de conquête depuis la carte. Voir `docs/JOURNAL_DEVELOPPEMENT.md` pour le suivi réel des livraisons.

## 5. Structure cible

```text
/aos-campaign-app
  /app
    /(auth)
      /login
      /signup
    /dashboard
    /campaigns
      /new
      /join
      /[campaignId]
        /lobby
        /map
        /orders
        /reveal
        /results
  /components
    /auth
    /campaign
    /map
    /orders
    /ui
  /lib
    /supabase
    /campaigns
    /maps
    /orders
    /resolution
  /types
    database.ts
    campaign.ts
  /docs
  /supabase
    schema.sql
```

## Lot 1 — Initialisation du projet

Objectif : squelette Next.js TypeScript Tailwind.

Tâches : créer l’app, Tailwind, ESLint, structure de dossiers, page d’accueil, layout global, composants UI `Button`, `Card`, `Input`, `Select`, `Badge`, `PageHeader`.

Critères : app démarre, accueil s’affiche, composants existent, lint/build passent.

## Lot 2 — Configuration Supabase

Créer `/lib/supabase/client.ts`, `/lib/supabase/server.ts`, `.env.example`, documenter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Ne pas exposer de secret.

## Lot 3 — Schéma SQL Supabase

Créer `/supabase/schema.sql` avec tables : `profiles`, `campaigns`, `campaign_players`, `territories`, `territory_adjacencies`, `campaign_turns`, `orders`, `battles`, `battle_participants`, `explorations`, `campaign_logs`. Ajouter contraintes, clés étrangères, checks, RLS et policies simples.

## Lot 4 — Authentification

Pages `/signup`, `/login`, `/dashboard`. Inscription avec email, mot de passe, pseudo. Création automatique `profiles`. Connexion, déconnexion, routes protégées.

## Lot 5 — Dashboard personnel

Afficher les campagnes de l’utilisateur par statut : lobby, active, finished/archived. Boutons créer/rejoindre/ouvrir/modifier profil.

## Lot 6 — Création de campagne modulaire

Page `/campaigns/new`. Champs : nom, nombre de joueurs 2 à 6. Créer `MAP_CONFIGS` dans `/lib/maps/map-configs.ts`. À la création : `invite_code`, `map_width`, `map_height`, `map_template`, ligne `campaigns`, créateur `game_master` actif. Redirection lobby.

## Lot 7 — Rejoindre une campagne

Page `/campaigns/join`. Champs : code, pseudo, faction, couleur, capitale. Vérifier campagne lobby, place, couleur/capitale disponibles, capitale autorisée. Créer joueur `pending`.

## Lot 8 — Lobby

Page `/campaigns/[campaignId]/lobby`. Afficher joueurs actifs/pending, code, places, couleurs, factions, capitales, statuts prêt. Maître accepte/refuse. Joueurs se mettent prêts. Lancement uniquement si conditions respectées.

## Lot 9 — Génération automatique de carte

Créer `/lib/maps/generate-map.ts`, `territory-names.ts`, `territory-distribution.ts`, `map-utils.ts`. Générer codes, coordonnées, capitales, propriétaires, fortifications centrales, types, noms, adjacences hexagonales pour les templates `hex_v1_*`, insert DB.

## Lot 10 — Lancement de campagne

Au clic Lancer : vérifier lobby, appeler `generateMap`, créer tour 1, `army_base_points=0`, status active, phase orders, `current_turn_number=1`, log.

## Lot 11 — Dashboard de campagne

Page `/campaigns/[campaignId]`. Écran principal de campagne : nom, Saison/Tour, phase, points d’armée, carte interactive, sélection de territoire, ordres directs depuis la carte, annulation d'ordre en phase orders, classement, statut ordres, actions selon rôle/phase, historique récent.

## Lot 12 — Carte interactive dynamique

La carte interactive est intégrée à `/campaigns/[campaignId]`. La route `/campaigns/[campaignId]/map` reste disponible mais redirige vers la page campagne. Carte dynamique `map_width` x `map_height`, rendu hexagonal pour `hex_v1_*`, couleurs, neutres, types, noms, fortifications, fiche au clic. Ne jamais supposer 4x4.

## Lot 13 — Ordres secrets

Les ordres se donnent depuis la carte de `/campaigns/[campaignId]`. La route `/campaigns/[campaignId]/orders` reste disponible mais redirige vers la page campagne. Actions affichées : `Conquérir`, `Fortifier`. Actions internes : `conquer`, `fortify`. Validation source/cible/adjacence/propriété. Un ordre par joueur et par tour. Modification et annulation possibles en phase orders, avant révélation.

## Lot 14 — Visibilité des ordres

Avant révélation : propriétaire seulement pour les détails, autres = statut. Après révélation : tous les membres actifs voient tous les ordres.

## Lot 15 — Révélation

Page `/campaigns/[campaignId]/reveal`. Page de suivi/compatibilité. La révélation est automatique après le dernier ordre validé. Effets : ordres revealed, batailles, conquêtes automatiques, fortifications, log. Si aucune bataille n'est créée, le tour suivant s'ouvre automatiquement.

## Lot 16 — Génération batailles/conquêtes

`conquer` vers territoire ennemi -> `battles`. `conquer` vers territoire neutre seul -> D6 automatique et ligne `explorations` résolue. `conquer` vers territoire neutre ciblé par plusieurs joueurs -> bataille multi-joueurs avec participants et D6 d'avantage. `fortify` -> `territories.is_fortified=true` + log, sauf forteresse ou territoire déjà fortifié. Les fortifications sont appliquées avant la création des batailles pour compter si le territoire est attaqué le même tour.

## Lot 17 — Résolution des conquêtes automatiques

Page `/campaigns/[campaignId]/results`. Les conquêtes neutres non contestées sont déjà résolues automatiquement à la révélation. La difficulté dépend du soutien adjacent : 1 territoire contrôlé adjacent = réussite sur 3+, 2 territoires contrôlés adjacents = réussite sur 2+, 3 territoires contrôlés adjacents ou plus = conquête automatique. Dragon et Géant réussissent sur 4+ avec 1 soutien, puis suivent les seuils tactiques 2+/automatique avec 2 ou 3 soutiens. +1 Gloire dans tous les cas, +1 supplémentaire si une ruine est conquise pour la première fois, +3 si un Dragon ou un Géant est conquis. Succès = territoire au joueur. Status resolved, log.

## Lot 18 — Résolution des batailles

Chaque participant peut engager ses Dragons/Géants disponibles avant résolution : Dragon +160 points, Géant +120 points, réserve protégée. Maître saisit vainqueur + notes + pertes légendaires plafonnées aux unités engagées. Attaquant gagne : territoire à attaquant, +3/+1. Défenseur gagne : territoire attaqué inchangé, +2/+1, et capture le territoire source de l'attaque s'il est encore contrôlé par l'attaquant. Capitale capturée : +5 Gloire attaquant. Ruine conquise pour la première fois : +1 Gloire. Fortification/forteresse : +200 points défenseur. Retirer seulement la fortification manuelle. Status played, log.

## Lot 19 — Fin de tour

Maître finit si toutes conquêtes automatiques sont resolved et batailles played/cancelled. Appliquer les revenus de Gloire (`floor(territoires / 3)` + gisements), clôturer tour, créer suivant, incrémenter, recalculer points, phase orders, log. Ne jamais bloquer au tour 6.

## Lot 20 — Historique simple

Composant `CampaignLog`. Afficher campagne créée, joueur rejoint/accepté, lancement, ordres révélés, conquêtes, batailles, fortifications, tours terminés.

## Lot 21 — Qualité UX et responsive

Navigation, loading/error/empty states, confirmations, responsive, lisibilité carte, badges, icônes, erreurs Supabase. Confirmations pour lancer, saisir résultat, finir tour, retirer/refuser joueur. La révélation des ordres se déclenche automatiquement après le dernier ordre validé.

État partiel déjà livré : écran campagne compact, carte et ordres fusionnés, routes legacy redirigées, ordre annulable, action de conquête affichée uniquement quand une cible conquérable est sélectionnée.

## Lot 22 — Messagerie diplomatique privée

Ajouter une messagerie privée sur l'écran principal. Les messages sont persistés en base, limités à 800 caractères, rattachés à un auteur et un destinataire, et visibles uniquement par ces deux joueurs actifs. Il n'y a pas de canal général visible par toute la table. Le temps réel et les notifications restent hors périmètre de ce lot.

## Backlog post-MVP

V2 héros ; V3 Dragons/Géants/mercenaires ; V4 détachements ; V5 diplomatie ; V6 cartes avancées.

## Prompts recommandés pour Codex

### Prompt 1

```text
Tu vas développer l’application HexRealm.

Lis les fichiers :
- docs/PRODUCT_SPEC.md
- docs/DATA_MODEL.md
- docs/IMPLEMENTATION_PLAN.md
- docs/CODEX_INSTRUCTIONS.md
- docs/UI_WIREFRAMES.md
- docs/MAP_DESIGN.md

Commence uniquement par le Lot 1 de IMPLEMENTATION_PLAN.md.
Crée le squelette Next.js TypeScript Tailwind, la structure de dossiers, une page d’accueil, un layout global et les composants UI de base.
Ne configure pas Supabase. Ne code pas l’authentification. Ne code pas les campagnes.
À la fin, vérifie lint/build et résume les fichiers créés.
```

### Prompt 2

```text
Implémente uniquement le Lot 2. Ajoute la configuration Supabase côté client et serveur, `.env.example`, sans exposer de clé secrète.
```

### Prompt 3

```text
Implémente uniquement le Lot 3. Crée `supabase/schema.sql` selon `docs/DATA_MODEL.md` avec tables, contraintes, clés étrangères, checks et RLS de base.
```

### Prompt 4

```text
Implémente uniquement le Lot 4. Ajoute signup, login, dashboard, inscription, connexion, déconnexion et création automatique du profil.
```

### Prompt 5

```text
Implémente uniquement le Lot 5. Le dashboard affiche les campagnes de l’utilisateur par statut et les boutons créer/rejoindre.
```

### Prompt 6

```text
Implémente uniquement le Lot 6. Page création campagne 2 à 6 joueurs, MAP_CONFIGS, invite_code unique, créateur game_master actif, redirection lobby.
```

### Prompt 7

```text
Implémente uniquement le Lot 7. Page rejoindre avec code, pseudo, faction, couleur, capitale. Vérifications et création pending.
```

### Prompt 8

```text
Implémente uniquement le Lot 8. Lobby avec joueurs, demandes, prêt, accept/refuse, lancement conditionnel.
```

### Prompt 9

```text
Implémente les Lots 9 et 10. Génération carte, territoires, capitales, adjacences, tour 1, status active, phase orders.
```

### Prompt 10

```text
Implémente les Lots 11 et 12. Dashboard campagne et carte interactive dynamique. Ne suppose jamais 4x4.
```

### Prompt 11

```text
Implémente les Lots 13 et 14. Ordres secrets, validation, visibilité avant/après révélation.
```

### Prompt 12

```text
Implémente les Lots 15 et 16. Révélation par maître, génération batailles/conquêtes automatiques/fortifications, phase resolving.
```

### Prompt 13

```text
Implémente les Lots 17 et 18. Résolution conquêtes automatiques et batailles, Gloire, territoires, logs.
```

### Prompt 14

```text
Implémente les Lots 19 et 20. Fin de tour et historique. Campagne sans fin automatique.
```

### Prompt 15

```text
Implémente le Lot 21. Polish UX responsive, états, confirmations, badges, icônes. Ne change pas les règles métier.
```

## Définition du MVP terminé

Le scénario de bout en bout doit fonctionner : compte, campagne 2-6, invitation, lobby, lancement, carte, ordres secrets, révélation, conquêtes/batailles, résultats, Gloire, tour suivant, campagne continue.

## Qualité

Avant de considérer le MVP utilisable : `npm run typecheck`, `npm run lint`, `npm run test` et `npm run build` doivent passer ou les exceptions être documentées.
