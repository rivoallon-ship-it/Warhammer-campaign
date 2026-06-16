# JOURNAL_DEVELOPPEMENT.md
## HexRealm
### Suivi du travail réalisé

Dernière mise à jour : 2026-06-07.

Ce document résume le travail réalisé depuis le début du développement. Il complète le `README.md`, le plan d'implémentation et l'historique Git.

## État actuel

Le MVP principal est fonctionnel jusqu'au cycle de campagne complet :

- création de compte et connexion ;
- création et rejoindre une campagne ;
- invitation sécurisée côté base de données, avec vérification du code par fonction SQL ;
- lobby avec validation des joueurs ;
- lancement de campagne ;
- génération automatique de carte de 2 à 6 joueurs ;
- page campagne centrale avec carte interactive ;
- ordres secrets directement depuis la carte ;
- annulation ou remplacement d'un ordre tant que les ordres ne sont pas révélés ;
- révélation automatique dès que tous les joueurs actifs ont validé leur ordre ;
- génération des batailles ;
- conquêtes neutres résolues automatiquement ;
- batailles multi-joueurs quand plusieurs joueurs visent le même territoire neutre ;
- saisie du vainqueur des batailles ;
- mise à jour des territoires, de la Gloire et des fortifications ;
- recrutement Dragon/Géant pendant la phase d'ordres ;
- conservation des unités légendaires recrutées jusqu'à perte déclarée en bataille ;
- fin de tour et passage au tour suivant sans limite automatique ;
- historique de campagne ;
- RLS renforcée sur la lecture des lobbys et les demandes d'inscription.

Le Lot 21, consacré à l'ergonomie et au confort d'utilisation, est bien avancé. Les pages `map` et `orders` ont été fusionnées dans l'écran principal de campagne, la carte est passée en hexagones et l'écran de jeu a reçu une direction graphique fantasy sombre. Il reste du polish à faire sur le responsive, les états d'erreur et quelques détails visuels après tests réels.

## Interface actuelle de campagne

La page centrale est maintenant `/campaigns/[campaignId]`.

Elle regroupe :

- l'en-tête de campagne : statut, phase, rôle, saison, tour, points d'armée, taille de carte, nombre de territoires, neutres et ordres soumis ;
- les actions de phase : lobby, résultats, fin de tour, rejoindre, dashboard ;
- les messages de retour : campagne lancée, tour terminé, ordre enregistré, ordre annulé, erreur ;
- la carte interactive ;
- le panneau de commandement du territoire sélectionné ;
- le classement, le statut des ordres et l'historique.

Direction graphique actuelle :

- fond sombre texturé ;
- panneaux bordés or ;
- carte dans un panneau sombre ;
- hexagones en style parchemin ;
- badges de type colorés ;
- halos de sélection ;
- boutons d'action fantasy avec loader quand une action prend du temps.

Affichage actuel des hexagones :

- tag de type en haut ;
- nom du territoire au centre sur deux lignes maximum, avec une typographie compacte ;
- propriétaire en bas ;
- badge `Bataille` ou `Fortifié` seulement quand l'état est utile.

Les anciennes routes restent présentes pour éviter les liens cassés :

- `/campaigns/[campaignId]/map` redirige vers `/campaigns/[campaignId]` ;
- `/campaigns/[campaignId]/orders` redirige vers `/campaigns/[campaignId]`.

### UX actuelle des ordres

Le joueur ne passe plus par une page de formulaire séparée.

Flux actuel :

1. Le joueur clique sur un territoire de la carte.
2. Si le territoire lui appartient, le panneau propose `Fortifier` et liste les cibles à portée.
3. Si le territoire sélectionné est conquérable, le panneau affiche directement `Conquérir`.
4. Une fois l'ordre soumis, le bandeau de confirmation propose `Annuler l'ordre`.
5. L'ordre peut aussi être annulé depuis le panneau `Ordre actuel`.

Techniquement, l'annulation repasse l'ordre en `draft` avec `submitted_at = null`. Il n'est donc plus compté comme ordre validé, et un nouvel ordre peut le remplacer pendant la phase `orders`.

## Règle actuelle des ordres

L'interface présente deux actions principales :

- `Conquérir` ;
- `Fortifier`.

En base de données, les ordres sont stockés avec :

- `conquer` pour conquérir un territoire neutre ou ennemi ;
- `fortify` pour fortifier un territoire contrôlé.

Les anciens termes `attack` et `explore` ne sont plus utilisés pour les nouveaux ordres. Ils peuvent seulement apparaître comme compatibilité avec de vieilles données ou de vieux libellés.

### Conquête d'un territoire neutre

Si un seul joueur vise un territoire neutre :

- le D6 est lancé automatiquement par la base de données au moment de la révélation ;
- 1 territoire contrôlé adjacent à la cible : réussite sur 3+ ;
- 2 territoires contrôlés adjacents à la cible : réussite sur 2+ ;
- 3 territoires contrôlés adjacents ou plus : conquête automatique ;
- le joueur gagne +1 Gloire dans tous les cas ;
- en cas de succès, le territoire devient contrôlé par ce joueur.

### Conquête contestée d'un territoire neutre

Si deux joueurs ou plus visent le même territoire neutre :

- l'application crée une bataille multi-joueurs ;
- chaque participant reçoit un D6 automatique pour déterminer l'avantage ;
- ce D6 ne donne pas directement le territoire ;
- le territoire est attribué au vainqueur saisi après la bataille.

### Conquête d'un territoire ennemi

Si un joueur vise un territoire déjà contrôlé par un adversaire :

- l'application crée une bataille entre l'attaquant et le défenseur ;
- si le territoire est fortifié, le bonus défensif est indiqué ;
- après la bataille, le maître saisit le vainqueur ;
- le territoire passe au vainqueur ;
- la fortification est retirée si elle a été utilisée.

### Fortification

Si un joueur fortifie un territoire qu'il contrôle :

- le territoire devient fortifié ;
- un territoire déjà fortifié ne gagne pas de niveau supplémentaire.

## Chronologie des livraisons

### 2026-05-26

- Initialisation du projet Next.js, TypeScript, Tailwind CSS.
- Correction de l'installation Vercel via le lockfile npm.
- Configuration Supabase côté client et serveur.
- Premières pages d'authentification.
- Création du schéma SQL Supabase.
- Correction de la création automatique des profils.
- Authentification complète.
- Dashboard personnel.
- Création de campagne.
- Rejoindre une campagne.
- Lobby de campagne avec gestion des joueurs.
- Génération automatique de carte.
- Lancement de campagne depuis le lobby.
- Dashboard de campagne.
- Carte interactive.

Commits principaux :

- `490c61a` Initialise Next.js campaign app
- `ada671f` Fix Vercel npm install lockfile
- `1a4cb60` Configure Supabase clients
- `7e35126` Add basic Supabase auth pages
- `c4c82dc` Add Supabase database schema
- `325abb3` Backfill profiles in schema
- `3d66564` Complete Supabase authentication flow
- `60f00ef` Build personal campaign dashboard
- `4c75292` Build campaign creation flow
- `3888ee3` Build campaign join flow
- `459b2a9` Build campaign lobby management
- `33f41a8` Add dynamic map generation
- `911fe2a` Launch campaigns from lobby
- `7787c0b` Build campaign dashboard
- `a1ce24d` Build interactive campaign map

### 2026-05-27

- Ordres secrets.
- Règles de visibilité des ordres.
- Révélation des ordres.
- Résolution des explorations, ancienne appellation des conquêtes neutres.
- Résolution des batailles.
- Découpage du SQL Supabase en fichiers copiables par morceaux.
- Fin de tour.
- Historique de campagne.

Commits principaux :

- `633e40b` Build secret orders flow
- `b054d52` Add order visibility rules
- `d3d635f` Build order reveal flow
- `fdffaed` Resolve exploration results
- `e13fc1e` Resolve battle results
- `dc6ec8c` Add chunked Supabase setup scripts
- `04b967e` Finish campaign turns
- `7e0e3dc` Add campaign log component

### 2026-05-29

- Automatisation des conquêtes neutres solo.
- Création des batailles multi-joueurs quand plusieurs joueurs visent le même territoire neutre.
- Ajout de la table `battle_participants`.
- Mise à jour de la résolution de bataille pour accepter plus de deux participants.
- Fusion métier des anciennes actions `attack` et `explore` en une action interne `conquer`.
- Mise à jour des scripts SQL Supabase associés.
- Création du premier écran de commandement sur la carte.
- Redirection des anciennes pages `/map` et `/orders` vers la page campagne.
- Documentation du suivi de développement.

Commits principaux :

- `a3c8b05` Automate conquest resolution
- `3a693f7` Store conquest orders internally
- `fbb4f83` Document development progress
- `da40374` Add campaign command map
- `f94392a` Redirect legacy campaign pages

### 2026-05-30

- Simplification de l'écran de campagne.
- Fusion visuelle de l'en-tête, des actions, de la carte et du suivi de campagne.
- Regroupement `Classement` et `Statut des ordres` dans un bloc `Joueurs et ordres`.
- Intégration de la légende directement dans la carte.
- Ajout de l'annulation d'un ordre soumis pendant la phase d'ordres.
- Suppression du bouton peu explicite `Conquérir depuis ...`.
- Nouveau flux de conquête : l'action apparaît quand le joueur clique sur une cible conquérable.
- Affichage des territoires de départ possibles quand plusieurs sources peuvent attaquer la même cible.

Commits principaux :

- `de6763c` Simplify campaign command screen
- `730aeb4` Allow cancelling submitted orders
- `aa4b9bc` Show conquest actions from target selection

### 2026-06-01

- Simplification du panneau de commandement à droite.
- Suppression des blocs `Type` et `Adjacents`, déjà visibles sur la carte.
- Remplacement du bloc explicatif de conquête par un bouton direct `Conquérir`.
- Sélection automatique d'une source valide quand plusieurs territoires contrôlés peuvent attaquer la cible.
- Modification de la progression des points d'armée : 0 point au tour 1, +200 points par tour, maximum 2000 points.
- Ajout du correctif SQL `supabase/02_CORRECTIF_POINTS_ARMEE.sql` pour mettre à jour une base Supabase déjà installée.
- Suppression des codes visibles de territoires comme `A1` ou `A2` sur la carte et dans les résumés d'ordre ; ces codes restent uniquement techniques pour l'adjacence et les scripts.
- Suppression des badges d'en-tête `Active`, `Ordres` et `Maître/Joueur` sur la page campagne pour réduire le bruit visuel.
- Suppression de la légende permanente du bloc carte (`Départ possible`, `Cible conquérable`, `Adjacent`, `Neutre`) pour garder l'écran plus lisible.
- Simplification des couleurs de carte : suppression des surlignages d'adjacence/départ/cible, affichage par couleur de propriétaire, neutre ou bataille en cours.
- Ajout d'un état de chargement sur le bouton `Conquérir` pour indiquer que l'ordre est en cours d'enregistrement et éviter les doubles clics.
- Ajout du bloc `Progression du tour` : phase Ordres, Révélation et Résultats, avec les actions maître au bon moment.
- Suppression de la confirmation navigateur sur `Révéler les ordres` et ajout d'un état de chargement dédié.
- Suppression de la confirmation navigateur sur `Résoudre la bataille` et ajout d'un état de chargement dédié.
- Suppression de la confirmation navigateur sur `Terminer le tour` et ajout d'un état de chargement dédié.
- Passage des nouvelles campagnes aux cartes hexagonales `hex_v1_*` : cartes plus grandes, capitales repositionnées, adjacence à six voisins et rendu de carte en lignes décalées.

### 2026-06-03

- Correction de l'alignement visuel des hexagones : lignes décalées de manière cohérente avec l'adjacence.
- Adaptation de l'écran de campagne à une direction graphique fantasy sombre : fond texturé, panneaux bordés or, carte sombre, hexagones parchemin, badges de types colorés et boutons stylés.
- Séparation du rendu interne des hexagones et du rendu carré de secours pour éviter les effets de bord.
- Réorganisation de l'affichage dans les hexagones : type en haut, nom centré sur deux lignes en plus petit, propriétaire en bas.

Commits principaux :

- `4d8ae25` Add hex campaign maps
- `339e1a7` Fix hex map alignment
- `3a429f3` Apply fantasy campaign interface theme
- `d390552` Refine hex territory label layout

### 2026-06-04

- Relecture de la code review externe et traitement du premier lot prioritaire.
- Durcissement de l'invitation par code au niveau Supabase :
  - ajout de `normalize_invite_code`, `get_join_campaign_details` et `request_join_campaign` ;
  - `get_join_campaign_details` retourne seulement les informations minimales d'un lobby quand le code fourni est valide ;
  - `request_join_campaign` vérifie le code, le statut `lobby`, la place disponible, la couleur et la capitale avant de créer un joueur `pending` ;
  - les joueurs ne peuvent plus s'inscrire par un `insert` direct dans `campaign_players` ;
  - les policies RLS ne donnent plus accès à tous les lobbys et à leurs joueurs simplement parce qu'une campagne est en statut `lobby`.
- Ajout du correctif SQL `supabase/06_SECURITE_INVITATIONS.sql` pour mettre à jour une base Supabase existante.
- Mise à jour du SQL complet et des morceaux copiables Supabase pour intégrer ces fonctions et policies.
- Correction du contrôle d'idempotence de `generateMap` : les cartes `hex_v1_*` sont maintenant vérifiées avec le comptage d'adjacence hexagonal, pas avec l'ancien comptage orthogonal.
- Ajout de verrous `for update` dans les fonctions SQL critiques de transition :
  - `reveal_current_turn_orders` ;
  - `resolve_battle_result` ;
  - `finish_current_turn`.
- Vérification locale de la route `/campaigns/join`, qui redirige correctement vers `/login?next=%2Fcampaigns%2Fjoin` quand l'utilisateur n'est pas connecté.

Commit principal :

- `4b111d1` Secure campaign joins and map checks

### 2026-06-05

- Suppression de la validation manuelle du maître pour passer de la phase `Ordres` à la révélation.
- La soumission d'un ordre tente maintenant d'appeler automatiquement `reveal_current_turn_orders`.
- Si l'ordre soumis est le dernier ordre actif du tour, les ordres passent directement en `revealed`, les conquêtes automatiques, batailles et fortifications sont générées, puis la campagne passe en phase `resolving`.
- La progression du tour n'affiche plus de bouton `Révéler les ordres`; l'étape `Révélation` indique que le passage est automatique.
- La page `/campaigns/[campaignId]/reveal` devient une page de suivi/compatibilité pour les anciens liens, sans action maître obligatoire.
- La fonction SQL `reveal_current_turn_orders` accepte maintenant tout joueur actif de la campagne, mais garde le blocage si tous les ordres actifs ne sont pas soumis.
- Les scripts Supabase mis à jour sont `supabase/schema.sql`, `supabase/SQL_A_COPIER_DANS_SUPABASE.sql`, `supabase/a_copier_par_morceaux/07_reveal_orders_function.sql` et les anciens correctifs de révélation.
- Ajout du passage automatique au tour suivant quand la révélation ne crée aucune bataille :
  - les ordres révélés passent en `resolved` ;
  - le tour courant passe en `finished` ;
  - le tour suivant est créé en phase `orders` ;
  - l'interface affiche un message indiquant qu'aucune bataille n'était à résoudre.
- Ajout des premières règles de territoires :
  - `CA` Capitale : +5 Gloire pour l'attaquant qui la capture ;
  - `VI` Village : +100 points d'armée, plafonné à +200 ;
  - `GE` Gisement : +1 Gloire à chaque fin de tour ;
  - `FO` Forteresse : défense automatique, +200 points au défenseur ;
  - `RU` Ruines : +1 Gloire supplémentaire à la première conquête ;
  - `SA` Sauvage : aucun bonus.
- Le type technique `mine` a été ajouté pour les Gisements. Les Géants utilisent maintenant le tag `GI`.
- La fin de tour applique aussi `floor(territoires contrôlés / 3)` Gloire par joueur.
- L'interface affiche les effets des tags, les points d'armée effectifs et les revenus de fin de tour attendus.
- Ajout des effets de conquête et de bataille restants :
  - `TO` Tour magique : le défenseur dispose d'un magicien niveau 1 en bataille (santé 8, sauvegarde 4+) ;
  - `DR` Dragon et `GI` Géant : conquête neutre sur 4+ avec 1 soutien, +3 Gloire si conquis ;
  - en bataille multi-joueurs pour un Dragon/Géant neutre, le vainqueur reçoit aussi le +3 Gloire.
- Ajout du recrutement légendaire :
  - colonnes `dragon_recruits` et `giant_recruits` sur les joueurs ;
  - RPC `recruit_legendary_unit(campaign_id, unit_type)` ;
  - coûts équilibrés sur les valeurs d'armée : Dragon 10 Gloire pour 160 points, Géant 8 Gloire pour 120 points ;
  - prérequis : contrôler au moins un territoire du type recruté ;
  - recrutement limité à la phase d'ordres côté interface et côté SQL ;
  - carte de recrutement sur l'écran campagne et log `legendary_recruitment`.
- Redécoupage des morceaux SQL Supabase pour que chaque fichier à copier reste sous 100 lignes :
  - remplacement de l'ancien `05_auth_helpers_2.sql` par `05a`, `05b`, `05c` ;
  - compactage de `08_resolve_exploration_function.sql` et `09b_finish_turn_function.sql` ;
  - mise à jour de `00_LIRE_AVANT_DE_COPIER.md`.
- Déplacement du bloc `Recrutements` dans la colonne droite de la carte, sous les informations du territoire sélectionné.
- Affichage des renforts Dragon/Géant disponibles sur les participants dans l'écran de résolution des batailles, sans consommation automatique.
- Ajout des pertes légendaires à la résolution des batailles :
  - saisie des Dragons/Géants perdus par participant ;
  - validation contre le stock disponible ;
  - décrément automatique des compteurs `dragon_recruits` et `giant_recruits` ;
  - trace des pertes dans l'historique de bataille.

### Mise à jour du 2026-06-07 : unités légendaires persistantes

- Le recrutement Dragon/Géant est maintenant une décision de phase d'ordres uniquement.
- Les coûts sont différenciés : Dragon 10 Gloire, Géant 8 Gloire.
- L'interface bloque le bouton de recrutement hors phase d'ordres et affiche une raison lisible au joueur.
- La fonction SQL `recruit_legendary_unit` vérifie aussi la phase de la campagne et du tour courant, afin que la règle ne dépende pas seulement de l'interface.
- Les Dragons et Géants recrutés restent sur le joueur via `campaign_players.dragon_recruits` et `campaign_players.giant_recruits`.
- Pendant la résolution d'une bataille entre joueurs, le maître de campagne peut saisir combien de Dragons/Géants chaque participant perd.
- La résolution valide les pertes contre le stock disponible, décrémente les compteurs et ajoute les pertes au journal de bataille.
- La RPC `resolve_battle_result` valide et verrouille toutes les pertes légendaires avant de modifier les compteurs, afin d'éviter une résolution partiellement appliquée.
- Le morceau Supabase à recopier pour cette partie est `supabase/a_copier_par_morceaux/16_legendary_recruitment.sql`, qui reste sous la limite de 100 lignes.

### Mise à jour du 2026-06-07 : engagements légendaires en bataille

- Ajout des engagements par bataille sur `battle_participants` :
  - `dragon_recruits_committed` ;
  - `giant_recruits_committed`.
- Un participant peut engager ses recrues pendant la phase de résolution via la RPC `commit_legendary_reinforcements`.
- Les engagements sont limités par le stock du joueur et par les autres batailles du même tour, afin qu'une même unité ne soit pas engagée deux fois.
- Un Dragon engagé ajoute +160 points d'armée ; un Géant engagé ajoute +120 points d'armée.
- Les recrues non engagées restent en réserve et ne peuvent pas être déclarées perdues.
- La résolution de bataille valide maintenant les pertes contre les unités engagées et contre le stock disponible.
- Morceaux Supabase à recopier pour cette partie :
  - `supabase/a_copier_par_morceaux/17_legendary_commitments.sql` ;
  - `supabase/a_copier_par_morceaux/09_resolve_battle_function.sql`.

### Mise à jour du 2026-06-07 : progression d'armée à zéro

- La taille d'armée de base commence maintenant à 0 point au tour 1.
- La progression devient +200 points par tour jusqu'au plafond de 2000 points :
  - tour 1 : 0 ;
  - tour 2 : 200 ;
  - tour 11 et suivants : 2000.
- Les contraintes SQL `campaign_turns.army_base_points` et `battles.army_base_points` acceptent maintenant `0`.
- Le morceau Supabase à recopier pour une base déjà installée est `supabase/a_copier_par_morceaux/18_zero_start_army_points.sql`.
- Les fonctions SQL de révélation automatique sans bataille et de fin de tour utilisent la nouvelle formule.

### Mise à jour du 2026-06-07 : tests et CI

- Ajout de Vitest pour tester les fonctions métier pures sans Supabase.
- Ajout des scripts `typecheck`, `test` et `test:watch`.
- Ajout de `.nvmrc` et de `engines.node` pour fixer une base Node 20+.
- Ajout d'une CI GitHub Actions sur `main` : installation, typecheck, lint, tests, build.
- Premiers tests automatisés sur les adjacences de carte, la distribution des territoires, les seuils de conquête, les revenus de Gloire, les bonus village, les points d'armée et les règles Dragon/Géant.

### Mise à jour du 2026-06-08 : chat de partie

- Ajout d'un chat simple sur l'écran principal de campagne.
- Ajout de la table Supabase `campaign_messages`.
- Les messages sont persistés, limités à 800 caractères et affichés du plus ancien au plus récent dans le bloc de chat.
- RLS : seuls les joueurs actifs peuvent lire les messages d'une campagne ; un joueur actif ne peut insérer que ses propres messages.
- Ajout de la Server Action `sendCampaignMessageAction`.
- Ajout du morceau Supabase `supabase/a_copier_par_morceaux/19_campaign_chat.sql`.
- Le temps réel et les notifications restent hors périmètre de ce premier lot.

### Mise à jour du 2026-06-15 : diplomatie privée

- Remplacement du chat général par une messagerie diplomatique privée.
- Ajout du champ `recipient_campaign_player_id` sur `campaign_messages`.
- L'interface affiche une conversation par interlocuteur, avec sélection du joueur destinataire.
- RLS : seuls l'auteur et le destinataire peuvent lire un message.
- Les nouveaux messages exigent un destinataire actif différent de l'auteur.
- Ajout du morceau Supabase `supabase/a_copier_par_morceaux/22_private_diplomacy_messages.sql`.

### Mise à jour du 2026-06-16 : fortification et contre-attaque

- La révélation applique maintenant les ordres `fortify` avant la création des batailles.
- Si un défenseur fortifie un territoire pendant le même tour où il est attaqué, la bataille reçoit donc le bonus `Fortification : défenseur +200 points d'armée`.
- Si l'attaquant perd une bataille contre un territoire adverse, le territoire source de l'attaque passe au défenseur s'il est encore contrôlé par l'attaquant.
- Le journal de bataille indique la perte du territoire source quand elle a lieu.
- Les morceaux Supabase concernés sont `supabase/a_copier_par_morceaux/07_reveal_orders_function.sql` et `supabase/a_copier_par_morceaux/09_resolve_battle_function.sql`.

### Mise à jour du 2026-06-16 : contraste de la carte

- Ajout d'un utilitaire de contraste couleur dans `lib/colors.ts`.
- Les hexagones choisissent maintenant automatiquement une couleur de texte claire ou sombre selon le fond calculé de la case.
- Les contours des territoires aux couleurs très sombres sont éclaircis pour rester visibles sur le fond de carte.
- Ajout de tests automatisés pour le calcul de contraste et les couleurs d'accent.

## Fichiers importants

### Application

- `app/(auth)/signup/page.tsx` : inscription.
- `app/(auth)/login/page.tsx` : connexion.
- `app/dashboard/page.tsx` : dashboard personnel.
- `app/campaigns/new/page.tsx` : création de campagne.
- `app/campaigns/join/page.tsx` : rejoindre une campagne.
- `app/campaigns/[campaignId]/lobby/page.tsx` : lobby.
- `app/campaigns/[campaignId]/page.tsx` : écran principal de campagne, carte interactive et ordres directs.
- `app/campaigns/[campaignId]/actions.ts` : actions de campagne, recrutement et envoi de message.
- `app/campaigns/[campaignId]/map/page.tsx` : redirection vers l'écran principal.
- `app/campaigns/[campaignId]/orders/page.tsx` : redirection vers l'écran principal.
- `app/campaigns/[campaignId]/reveal/page.tsx` : révélation.
- `app/campaigns/[campaignId]/results/page.tsx` : résultats et fin de tour.

### Logique métier

- `lib/campaigns` : création, rejoindre, lobby, lancement, dashboard, tours.
- `lib/maps` : configuration et génération de carte.
- `lib/orders` : validation, soumission, annulation et révélation des ordres.
- `lib/resolution` : lecture des batailles, conquêtes automatiques et résultats.
- `lib/supabase` : clients Supabase.

### Base de données

- `supabase/schema.sql` : schéma complet.
- `supabase/SQL_A_COPIER_DANS_SUPABASE.sql` : SQL complet en un seul fichier.
- `supabase/a_copier_par_morceaux` : SQL découpé pour Supabase.

Les derniers morceaux SQL importants pour la logique de conquête sont :

- `02c_conquer_action_type.sql`
- `06b_multi_battle_support.sql`
- `07_reveal_orders_function.sql`
- `04_CORRECTIF_REVELATION_SUCCESS_AMBIGU.sql` : correctif court à copier si Supabase affiche `column reference "success" is ambiguous` pendant la révélation.
- `05_RESET_CAMPAGNES.sql` : reset des campagnes de test sans supprimer les comptes ni les profils.
- `06_SECURITE_INVITATIONS.sql` : correctif de sécurité pour protéger la recherche et la demande de jonction par code d'invitation sur une base déjà installée.
- `09_resolve_battle_function.sql`
- `09b_finish_turn_function.sql`
- `15_territory_rules_schema.sql`
- `16_legendary_recruitment.sql`
- `18_zero_start_army_points.sql`
- `19_campaign_chat.sql`
- `22_private_diplomacy_messages.sql`
- `14_logs_grants.sql`

## Vérifications réalisées

Les lots ont été validés progressivement avec :

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- vérifications locales de routes quand nécessaire ;
- tests manuels guidés sur Supabase et Vercel.

Pour compiler avec la configuration Supabase du projet, utiliser les variables Vercel/Supabase habituelles :

```bash
NEXT_PUBLIC_SUPABASE_URL="https://icfhmokcjkokgntrerwv.supabase.co" NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_yJ-dAOAXhQsp-vlg_AVTsQ_vcwYsTJr" npm run build
```

## À faire ensuite

- Continuer le Lot 21 : responsive, confirmations et états d'erreur.
- Ajouter éventuellement le rafraîchissement temps réel du chat via Supabase Realtime.
- Tester un tour complet avec plusieurs vrais comptes.
- Étendre les tests automatisés sur les Server Actions et les transitions SQL critiques.
- Nettoyer progressivement les mentions historiques `exploration` quand elles ne sont plus utiles côté interface.
