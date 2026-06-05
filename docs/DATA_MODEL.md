# DATA_MODEL.md
## Les Couronnes Brisées
### Modèle de données Supabase — MVP en ligne

## 1. Objectif du modèle

Le modèle doit gérer : comptes utilisateurs, profils joueurs, campagnes 2 à 6 joueurs, cartes générées automatiquement, lobby, capitales, ordres secrets, révélation, conquêtes, batailles, fortifications, Gloire, historique et tours sans limite.

L’authentification est gérée par Supabase Auth. Les données applicatives sont stockées dans PostgreSQL.

## 2. Tables du MVP

| Table | Rôle |
|---|---|
| `profiles` | Profil public de l’utilisateur |
| `campaigns` | Campagnes créées |
| `campaign_players` | Joueurs inscrits dans une campagne |
| `territories` | Territoires générés pour une campagne |
| `territory_adjacencies` | Connexions entre territoires |
| `campaign_turns` | Tours de campagne |
| `orders` | Ordres secrets |
| `battles` | Batailles générées |
| `battle_participants` | Participants des batailles, y compris batailles multi-joueurs |
| `explorations` | Résultats des conquêtes neutres automatiques |
| `campaign_logs` | Historique simple |

## 3. `profiles`

Champs :

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | uuid | Oui | Identique à `auth.users.id` |
| `display_name` | text | Oui | Pseudo public |
| `avatar` | text | Non | Avatar ou icône |
| `favorite_color` | text | Non | Couleur préférée |
| `created_at` | timestamptz | Oui | Date de création |
| `updated_at` | timestamptz | Oui | Date de mise à jour |

Contraintes : `id` référence `auth.users(id)` avec suppression cascade.

## 4. `campaigns`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | uuid | Oui | Identifiant unique |
| `name` | text | Oui | Nom de campagne |
| `invite_code` | text | Oui | Code court unique |
| `owner_user_id` | uuid | Oui | Créateur |
| `status` | text | Oui | Statut global |
| `current_phase` | text | Oui | Phase actuelle |
| `season_number` | int | Oui | Saison actuelle |
| `current_turn_number` | int | Oui | Tour actuel |
| `player_count` | int | Oui | Nombre de joueurs attendu |
| `map_width` | int | Oui | Largeur carte |
| `map_height` | int | Oui | Hauteur carte |
| `map_template` | text | Oui | Template carte |
| `created_at` | timestamptz | Oui | Création |
| `updated_at` | timestamptz | Oui | Mise à jour |

Contraintes : `invite_code` unique, `player_count` entre 2 et 6, largeur/hauteur > 0, `owner_user_id` référence `auth.users(id)`.

`status` : `lobby`, `active`, `season_end`, `finished`, `archived`.

`current_phase` : `lobby`, `orders`, `revealed`, `resolving`, `end_turn`, `season_summary`, `finished`.

Le code d'invitation ne doit pas être exploité par un `select` direct ouvert sur toutes les campagnes en `lobby`. La consultation d'un lobby par un non-membre passe par `get_join_campaign_details(invite_code)`, qui retourne seulement les informations minimales nécessaires quand le code fourni est valide.

## 5. Configuration des cartes

À stocker dans `/lib/maps/map-configs.ts` :

```ts
export const MAP_CONFIGS = {
  2: { width: 5, height: 4, template: "hex_v1_2p", capitalSlots: ["A1", "D5"] },
  3: { width: 6, height: 5, template: "hex_v1_3p", capitalSlots: ["A1", "A6", "E3"] },
  4: { width: 7, height: 5, template: "hex_v1_4p", capitalSlots: ["A1", "A7", "E1", "E7"] },
  5: { width: 8, height: 6, template: "hex_v1_5p", capitalSlots: ["A1", "A8", "F1", "F8", "C4"], fortifiedCapitalSlots: ["C4"] },
  6: { width: 9, height: 6, template: "hex_v1_6p", capitalSlots: ["A1", "A9", "F1", "F9", "C4", "D6"], fortifiedCapitalSlots: ["C4", "D6"] },
} as const;
```

## 6. `campaign_players`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | uuid | Oui | Identifiant joueur-campagne |
| `campaign_id` | uuid | Oui | Campagne |
| `user_id` | uuid | Oui | Utilisateur |
| `display_name` | text | Oui | Pseudo campagne |
| `aos_faction` | text | Non | Faction AoS |
| `color` | text | Non | Couleur |
| `role` | text | Oui | `player` ou `game_master` |
| `status` | text | Oui | `pending`, `active`, `rejected`, `left` |
| `starting_capital_code` | text | Non | Capitale choisie |
| `glory` | int | Oui | Gloire actuelle |
| `is_ready` | boolean | Oui | Prêt dans le lobby |
| `created_at` | timestamptz | Oui | Entrée |
| `updated_at` | timestamptz | Oui | Mise à jour |

Contraintes : `campaign_id` référence `campaigns`, `user_id` référence `auth.users`, unique `(campaign_id, user_id)`. Règles applicatives : couleur/capitale uniques parmi joueurs actifs, pas plus de joueurs actifs que `player_count`.

L'inscription d'un joueur `pending` ne doit pas être faite par un `insert` direct depuis l'application. Le chemin normal est la fonction `request_join_campaign(invite_code, ...)`, qui vérifie le code, le statut du lobby, les places restantes, la couleur et la capitale. La policy `insert` directe de `campaign_players` sert uniquement à la création de la ligne `game_master` par le propriétaire lors de la création de campagne.

## 7. `territories`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | uuid | Oui | Identifiant territoire |
| `campaign_id` | uuid | Oui | Campagne |
| `code` | text | Oui | Ex. `A1` |
| `name` | text | Oui | Nom narratif |
| `type` | text | Oui | Type |
| `position_x` | int | Oui | Colonne |
| `position_y` | int | Oui | Ligne |
| `owner_campaign_player_id` | uuid | Non | Propriétaire, null si neutre |
| `is_fortified` | boolean | Oui | Fortifié |
| `has_garrison` | boolean | Oui | Réservé futures versions |
| `local_faction` | text | Non | `dragon`, `giant` ou null |
| `created_at` | timestamptz | Oui | Création |
| `updated_at` | timestamptz | Oui | Mise à jour |

Types : `capital`, `village`, `ruins`, `fort`, `magic_tower`, `dragon`, `giant`, `wild`.

Contraintes : unique `(campaign_id, code)`, positions > 0.

## 8. Répartition des territoires

| Joueurs | capital | dragon | giant | village | ruins | fort | magic_tower | wild |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | 2 | 1 | 1 | 1 | 1 | 1 | 0 | 2 |
| 3 | 3 | 1 | 1 | 2 | 2 | 1 | 0 | 2 |
| 4 | 4 | 2 | 2 | 2 | 2 | 1 | 1 | 2 |
| 5 | 5 | 2 | 2 | 3 | 3 | 2 | 1 | 2 |
| 6 | 6 | 3 | 3 | 3 | 3 | 2 | 2 | 2 |

## 9. Banque de noms

Capitales : Bastion du Nord, Citadelle de l’Est, Forteresse de l’Ouest, Porte du Sud, Bastion Central, Rempart des Cendres.

Dragons : Nid des Dragons, Pic des Cendres, Caverne du Vieux Wyrm, Crête des Écailles, Sanctuaire des Ailes.

Géants : Camp des Géants, Plaine des Titans, Taverne des Ossements, Gorge du Colosse, Marteau des Terres Brisées.

Villages : Village Brûlé, Hameau des Brumes, Marché des Exilés, Refuge des Pêcheurs, Poste des Cendres.

Ruines : Ruines Célestes, Temple Englouti, Sanctuaire Fendu, Tombeau des Rois Perdus, Autel des Couronnes.

Forts : Fort du Tonnerre, Bastion Rouge, Muraille des Vents, Tour de Guet Brisée, Rempart des Éclats.

Tours magiques : Tour Arcanique, Observatoire d’Azyr, Flèche des Orages, Spire des Astres.

Sauvages : Forêt des Murmures, Canyon Rouge, Marais Hurlant, Landes Grises, Bois des Lueurs.

## 10. `territory_adjacencies`

Champs : `id`, `campaign_id`, `territory_code`, `adjacent_territory_code`.

Les campagnes `hex_v1_*` utilisent une adjacence hexagonale jusqu'à six voisins, avec lignes paires décalées. Stocker les deux sens. Unique `(campaign_id, territory_code, adjacent_territory_code)`.

## 11. `campaign_turns`

Champs : `id`, `campaign_id`, `season_number`, `turn_number`, `phase`, `army_base_points`, `event_name`, `event_description`, `started_at`, `ended_at`.

Phase : `orders`, `revealed`, `resolving`, `end_turn`, `finished`.

Unique `(campaign_id, turn_number)`.

```ts
export function getArmyBasePoints(turnNumber: number): number {
  return Math.min(400 + Math.max(turnNumber - 1, 0) * 200, 2000);
}
```

## 12. `orders`

Champs : `id`, `campaign_id`, `turn_id`, `campaign_player_id`, `action_type`, `source_territory_id`, `target_territory_id`, `status`, `submitted_at`, `revealed_at`, `created_at`, `updated_at`.

`action_type` : `conquer`, `fortify`.

`conquer` remplace les anciens cas séparés `attack` et `explore`.

Règles :

- cible ennemie : création d'une bataille ;
- cible neutre non contestée : D6 automatique et ligne `explorations` déjà résolue ;
- cible neutre contestée par plusieurs joueurs : bataille multi-joueurs ;
- cible contrôlée par le joueur : interdite.

`status` : `draft`, `submitted`, `revealed`, `resolved`.

Unique `(turn_id, campaign_player_id)`.

Règles de visibilité : avant révélation, propriétaire seulement ; après révélation, tous les joueurs actifs.

Annulation actuelle : tant que la campagne et le tour sont en phase `orders`, un ordre `submitted` ou `draft` peut être annulé par son propriétaire. L'application conserve la ligne `orders`, repasse `status` à `draft` et met `submitted_at` à `null`. L'ordre n'est alors plus compté comme validé et peut être remplacé.

## 13. `battles`

Champs : `id`, `campaign_id`, `turn_id`, `order_id`, `territory_id`, `attacker_campaign_player_id`, `defender_campaign_player_id`, `status`, `winner_campaign_player_id`, `army_base_points`, `defender_bonus`, `result_notes`, `created_at`, `resolved_at`.

`status` : `pending`, `played`, `cancelled`.

Pour une bataille classique contre un territoire ennemi : si attaquant gagne, territoire attaquant, attaquant +3, défenseur +1. Si défenseur gagne, territoire inchangé, défenseur +2, attaquant +1. Retirer fortification après bataille si elle a fourni un bonus.

Pour une bataille multi-joueurs sur territoire neutre : le vainqueur gagne le territoire et +3 Gloire, chaque autre participant gagne +1 Gloire.

## 14. `battle_participants`

Champs : `id`, `battle_id`, `campaign_id`, `campaign_player_id`, `order_id`, `role`, `dice_result`, `advantage_rank`, `created_at`.

`role` : `attacker`, `defender`, `contender`.

Cette table permet d'avoir plus de deux participants dans une bataille. Pour les batailles classiques, elle contient l'attaquant et le défenseur. Pour les batailles multi-joueurs sur territoire neutre, elle contient tous les prétendants avec leur D6 d'avantage.

## 15. `explorations`

Champs : `id`, `campaign_id`, `turn_id`, `order_id`, `campaign_player_id`, `territory_id`, `status`, `dice_result`, `success`, `created_at`, `resolved_at`.

`status` : `pending`, `resolved`. Dans le fonctionnement actuel, les conquêtes neutres non contestées sont créées directement en `resolved` à la révélation. D6 automatique : 1-2 échec, 3-6 succès. Joueur +1 Gloire dans tous les cas. Succès = territoire au joueur.

Le nom `explorations` reste en base pour compatibilité historique, mais l'interface parle de conquêtes automatiques.

## 16. `campaign_logs`

Champs : `id`, `campaign_id`, `turn_id`, `type`, `title`, `description`, `created_by_user_id`, `created_at`.

Types : `campaign_created`, `player_joined`, `player_approved`, `campaign_launched`, `orders_revealed`, `battle_created`, `battle_result`, `exploration_result`, `territory_fortified`, `turn_finished`, `season_finished`, `campaign_archived`.

`exploration_result` est conservé comme type technique pour les conquêtes neutres automatiques.

## 17. Fonctions métier attendues

- `createCampaign` : créer campagne, code, config carte, créateur game_master actif, log.
- `getJoinCampaignDetails` : appeler la RPC `get_join_campaign_details` pour lire les informations minimales d'un lobby à partir d'un code valide, sans exposer tous les lobbys par RLS.
- `joinCampaign` : appeler la RPC `request_join_campaign`; la base vérifie code/lobby/place/couleur/capitale puis crée joueur pending et log.
- `approvePlayer` : maître seulement, pending -> active, log.
- `launchCampaign` : vérifier conditions, générer carte, créer tour 1, status active, phase orders, log.
- `generateMap` : codes, capitales, propriétaires, fortifications centrales, types, noms, territoires, adjacences.
- `submitOrder` : vérifier joueur actif, phase, source, cible, adjacence, action légale ; après enregistrement, tenter la révélation automatique si tous les joueurs actifs ont soumis leur ordre.
- `cancelOrder` : vérifier joueur actif, phase orders, ordre non révélé, puis repasser l'ordre en draft.
- `revealOrders` : joueur actif, tous submitted, ordres revealed, batailles/conquêtes automatiques/fortifications, log. Cette fonction est appelée automatiquement après la soumission du dernier ordre. Si elle crée au moins une bataille, la campagne passe en phase `resolving`; si elle ne crée aucune bataille, elle clôture le tour courant, crée le tour suivant et repasse la campagne en phase `orders`.
- `resolveExploration` : compatibilité/correction manuelle des anciennes explorations, D6, Gloire, territoire si succès, status resolved, log.
- `resolveBattle` : maître, vainqueur, Gloire, territoire, fortification, participants multi-joueurs, status played, log.
- `finishTurn` : maître, tout résolu, clôturer tour, créer suivant, phase orders, log.

Les fonctions SQL de transition `reveal_current_turn_orders`, `resolve_battle_result` et `finish_current_turn` doivent verrouiller les lignes critiques avec `for update` afin d'éviter les doubles traitements en cas de double clic ou d'appel concurrent. `reveal_current_turn_orders` accepte un joueur actif, mais refuse tant que tous les ordres actifs ne sont pas soumis.

## 18. SQL conceptuel

Le fichier final sera `/supabase/schema.sql`.

```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar text,
  favorite_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby',
  current_phase text not null default 'lobby',
  season_number int not null default 1,
  current_turn_number int not null default 0,
  player_count int not null check (player_count between 2 and 6),
  map_width int not null check (map_width > 0),
  map_height int not null check (map_height > 0),
  map_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('lobby', 'active', 'season_end', 'finished', 'archived')),
  check (current_phase in ('lobby', 'orders', 'revealed', 'resolving', 'end_turn', 'season_summary', 'finished'))
);
```

## 19. RLS — règles fonctionnelles

Activer RLS sur toutes les tables applicatives.

Règle générale : un utilisateur lit les données d’une campagne uniquement s’il est membre (`campaign_players.user_id = auth.uid()` et status `pending` ou `active`).

Les campagnes en `lobby` ne sont pas lisibles globalement par tous les utilisateurs connectés. Un non-membre peut seulement fournir un code à `get_join_campaign_details`. La demande d'inscription passe par `request_join_campaign`; l'application ne doit pas contourner cette fonction par un `insert` direct dans `campaign_players`.

Règles spécifiques : ordres visibles uniquement au propriétaire avant révélation, puis aux membres actifs après révélation. Résultats, batailles, conquêtes automatiques (`explorations`), territoires : lecture par membres, modification par maître ou fonctions métier.

## 20. Données dérivées

Statut d’ordre, classement et joueur le plus faible peuvent être calculés depuis les tables plutôt que stockés.

## 21. Points d’attention Codex

Ne pas supposer 4 joueurs, ne pas coder une carte 4x4 fixe, ne pas bloquer au tour 6, ne pas révéler les ordres avant que tous les joueurs actifs aient soumis leur ordre, ne pas coder héros/mercenaires/détachements dans le MVP.
