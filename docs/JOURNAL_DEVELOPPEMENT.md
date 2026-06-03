# JOURNAL_DEVELOPPEMENT.md
## Les Couronnes Brisées
### Suivi du travail réalisé

Dernière mise à jour : 2026-06-01.

Ce document résume le travail réalisé depuis le début du développement. Il complète le `README.md`, le plan d'implémentation et l'historique Git.

## État actuel

Le MVP principal est fonctionnel jusqu'au cycle de campagne complet :

- création de compte et connexion ;
- création et rejoindre une campagne ;
- lobby avec validation des joueurs ;
- lancement de campagne ;
- génération automatique de carte de 2 à 6 joueurs ;
- page campagne centrale avec carte interactive ;
- ordres secrets directement depuis la carte ;
- annulation ou remplacement d'un ordre tant que les ordres ne sont pas révélés ;
- révélation par le maître de campagne ;
- génération des batailles ;
- conquêtes neutres résolues automatiquement ;
- batailles multi-joueurs quand plusieurs joueurs visent le même territoire neutre ;
- saisie du vainqueur des batailles ;
- mise à jour des territoires, de la Gloire et des fortifications ;
- fin de tour et passage au tour suivant sans limite automatique ;
- historique de campagne.

Le Lot 21, consacré à l'ergonomie et au confort d'utilisation, est commencé. Les pages `map` et `orders` ont été fusionnées dans l'écran principal de campagne, mais il reste du polish à faire sur le responsive, les confirmations et les états d'erreur.

## Interface actuelle de campagne

La page centrale est maintenant `/campaigns/[campaignId]`.

Elle regroupe :

- l'en-tête de campagne : statut, phase, rôle, saison, tour, points d'armée, taille de carte, nombre de territoires, neutres et ordres soumis ;
- les actions de phase : lobby, révélation, résultats, fin de tour, rejoindre, dashboard ;
- les messages de retour : campagne lancée, tour terminé, ordre enregistré, ordre annulé, erreur ;
- la carte interactive ;
- le panneau de commandement du territoire sélectionné ;
- le classement, le statut des ordres et l'historique.

Les anciennes routes restent présentes pour éviter les liens cassés :

- `/campaigns/[campaignId]/map` redirige vers `/campaigns/[campaignId]` ;
- `/campaigns/[campaignId]/orders` redirige vers `/campaigns/[campaignId]`.

### UX actuelle des ordres

Le joueur ne passe plus par une page de formulaire séparée.

Flux actuel :

1. Le joueur clique sur une case de la carte.
2. Si la case lui appartient, le panneau propose `Fortifier` et liste les cibles à portée.
3. Si la case sélectionnée est conquérable, le panneau affiche directement `Conquérir`.
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
- 1-2 : échec ;
- 3-6 : succès ;
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
- Modification de la progression des points d'armée : 400 points au tour 1, +200 points par tour, maximum 2000 points.
- Ajout du correctif SQL `supabase/02_CORRECTIF_POINTS_ARMEE.sql` pour mettre à jour une base Supabase déjà installée.
- Suppression des codes visibles de cases comme `A1` ou `A2` sur la carte et dans les résumés d'ordre ; ces codes restent uniquement techniques pour l'adjacence et les scripts.
- Suppression des badges d'en-tête `Active`, `Ordres` et `Maître/Joueur` sur la page campagne pour réduire le bruit visuel.
- Suppression de la légende permanente du bloc carte (`Départ possible`, `Cible conquérable`, `Adjacent`, `Neutre`) pour garder l'écran plus lisible.
- Simplification des couleurs de carte : suppression des surlignages d'adjacence/départ/cible, affichage par couleur de propriétaire, neutre ou bataille en cours.
- Ajout d'un état de chargement sur le bouton `Conquérir` pour indiquer que l'ordre est en cours d'enregistrement et éviter les doubles clics.
- Ajout du bloc `Progression du tour` : phase Ordres, Révélation et Résultats, avec les actions maître au bon moment.
- Suppression de la confirmation navigateur sur `Révéler les ordres` et ajout d'un état de chargement dédié.
- Suppression de la confirmation navigateur sur `Résoudre la bataille` et ajout d'un état de chargement dédié.
- Suppression de la confirmation navigateur sur `Terminer le tour` et ajout d'un état de chargement dédié.

## Fichiers importants

### Application

- `app/(auth)/signup/page.tsx` : inscription.
- `app/(auth)/login/page.tsx` : connexion.
- `app/dashboard/page.tsx` : dashboard personnel.
- `app/campaigns/new/page.tsx` : création de campagne.
- `app/campaigns/join/page.tsx` : rejoindre une campagne.
- `app/campaigns/[campaignId]/lobby/page.tsx` : lobby.
- `app/campaigns/[campaignId]/page.tsx` : écran principal de campagne, carte interactive et ordres directs.
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
- `09_resolve_battle_function.sql`
- `14_logs_grants.sql`

## Vérifications réalisées

Les lots ont été validés progressivement avec :

- `npm run lint`
- `npm run build`
- vérifications locales de routes quand nécessaire ;
- tests manuels guidés sur Supabase et Vercel.

Pour compiler avec la configuration Supabase du projet, utiliser les variables Vercel/Supabase habituelles :

```bash
NEXT_PUBLIC_SUPABASE_URL="https://icfhmokcjkokgntrerwv.supabase.co" NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_yJ-dAOAXhQsp-vlg_AVTsQ_vcwYsTJr" npm run build
```

## À faire ensuite

- Continuer le Lot 21 : responsive, confirmations et états d'erreur.
- Tester un tour complet avec plusieurs vrais comptes.
- Ajouter éventuellement des tests automatisés après stabilisation du MVP.
- Nettoyer progressivement les mentions historiques `exploration` quand elles ne sont plus utiles côté interface.
