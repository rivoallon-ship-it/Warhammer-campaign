# JOURNAL_DEVELOPPEMENT.md
## Les Couronnes Brisées
### Suivi du travail réalisé

Dernière mise à jour : 2026-05-29.

Ce document résume le travail réalisé depuis le début du développement. Il complète le `README.md`, le plan d'implémentation et l'historique Git.

## État actuel

Le MVP principal est fonctionnel jusqu'au cycle de campagne complet :

- création de compte et connexion ;
- création et rejoindre une campagne ;
- lobby avec validation des joueurs ;
- lancement de campagne ;
- génération automatique de carte de 2 à 6 joueurs ;
- carte interactive ;
- ordres secrets ;
- révélation par le maître de campagne ;
- génération des batailles ;
- conquêtes neutres résolues automatiquement ;
- batailles multi-joueurs quand plusieurs joueurs visent le même territoire neutre ;
- saisie du vainqueur des batailles ;
- mise à jour des territoires, de la Gloire et des fortifications ;
- fin de tour et passage au tour suivant sans limite automatique ;
- historique de campagne.

Le prochain gros lot prévu est le Lot 21 : qualité UX, responsive, confirmations et états d'erreur plus confortables.

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

Commits principaux :

- `a3c8b05` Automate conquest resolution
- `3a693f7` Store conquest orders internally

## Fichiers importants

### Application

- `app/(auth)/signup/page.tsx` : inscription.
- `app/(auth)/login/page.tsx` : connexion.
- `app/dashboard/page.tsx` : dashboard personnel.
- `app/campaigns/new/page.tsx` : création de campagne.
- `app/campaigns/join/page.tsx` : rejoindre une campagne.
- `app/campaigns/[campaignId]/lobby/page.tsx` : lobby.
- `app/campaigns/[campaignId]/page.tsx` : dashboard de campagne.
- `app/campaigns/[campaignId]/map/page.tsx` : carte interactive.
- `app/campaigns/[campaignId]/orders/page.tsx` : ordres secrets.
- `app/campaigns/[campaignId]/reveal/page.tsx` : révélation.
- `app/campaigns/[campaignId]/results/page.tsx` : résultats et fin de tour.

### Logique métier

- `lib/campaigns` : création, rejoindre, lobby, lancement, dashboard, tours.
- `lib/maps` : configuration et génération de carte.
- `lib/orders` : validation, soumission et révélation des ordres.
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

- Lot 21 : améliorer l'UX, le responsive, les confirmations et les états d'erreur.
- Tester un tour complet avec plusieurs vrais comptes.
- Ajouter éventuellement des tests automatisés après stabilisation du MVP.
- Nettoyer progressivement les mentions historiques `exploration` quand elles ne sont plus utiles côté interface.
